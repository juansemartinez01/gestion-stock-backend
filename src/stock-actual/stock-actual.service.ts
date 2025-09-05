import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { StockActual } from './stock-actual.entity';
import { CreateStockActualDto } from './dto/create-stock-actual.dto';
import { UpdateStockActualDto } from './dto/update-stock-actual.dto';
import { MovimientoStockService } from 'src/movimiento-stock/movimiento-stock.service';
import { RegistrarInsumoDto } from './dto/registrar-insumo.dto';
import { CancelarInsumoDto } from './dto/cancelar-insumo.dto';
import { ProductoPrecioAlmacen } from 'src/producto-precio-almacen/producto-precio-almacen.entity';

@Injectable()
export class StockActualService {
  constructor(
    @InjectRepository(StockActual)
    private readonly repo: Repository<StockActual>,
    private readonly movService: MovimientoStockService,

    @InjectRepository(ProductoPrecioAlmacen)
    private readonly ppaRepo: Repository<ProductoPrecioAlmacen>,
  ) {}



  /** Helper: resuelve precio final con override o usa precioBase */
  private resolvePrecioFinal(
    productoId: number,
    precioBase: any, // puede venir string si el DECIMAL lo devuelve así
    overrides: Map<number, number>,
  ): number {
    if (overrides.has(productoId)) return Number(overrides.get(productoId));
    return Number(precioBase ?? 0);
  }


  /** Convierte DECIMAL(string) a number de forma segura */
  private toNumber(n: any): number {
    const v = Number(n);
    return Number.isFinite(v) ? v : 0;
  }
  
  /** Devuelve todo el stock con precioFinal por fila (override o precioBase) */
  async findAll(): Promise<StockActual[]> {
    // 1) Traigo stock con relaciones
    const rows = await this.repo.find({ relations: ['producto', 'almacen'] });
    if (!rows.length) return rows;

    // 2) Preparo sets para consulta batch de overrides
    const productoIds = Array.from(new Set(rows.map(r => r.producto_id)));
    const almacenIds  = Array.from(new Set(rows.map(r => r.almacen_id)));

    // 3) Busco overrides de una sola vez
    const overrides = await this.ppaRepo.find({
      where: { producto_id: In(productoIds), almacen_id: In(almacenIds) },
    });

    // 4) Mapa clave -> precio (clave = "productoId:almacenId")
    const key = (pid: number, aid: number) => `${pid}:${aid}`;
    const mapOverride = new Map<string, number>();
    for (const o of overrides) {
      mapOverride.set(key(o.producto_id, o.almacen_id), this.toNumber(o.precio));
    }

    // 5) Anoto precioFinal en cada fila (propiedad dinámica)
    for (const r of rows) {
      const base = this.toNumber((r.producto as any)?.precioBase);
      const ov   = mapOverride.get(key(r.producto_id, r.almacen_id));
      (r as any).precioFinal = ov ?? base;
      // opcional: valor de la fila
      (r as any).valorFila = (r as any).precioFinal * this.toNumber(r.cantidad);
    }

    return rows;
  }

  async registrarEntrada(dto: CreateStockActualDto): Promise<StockActual> {
  const updated = await this.changeStock(dto.producto_id, dto.almacen_id, dto.cantidad);

  await this.movService.create({
    producto_id: dto.producto_id,
    origen_almacen: undefined,
    destino_almacen: dto.almacen_id,
    cantidad: dto.cantidad,
    tipo: 'entrada',
    motivo: dto.motivo || 'Reposición de stock',
    proveedor_id: dto.proveedor_id,
    precioUnitario: dto.precioUnitario,
    precioTotal: dto.precioTotal,
  });

  return updated;
}


  async findOne(
    producto_id: number,
    almacen_id: number,
  ): Promise<StockActual> {
    const stock = await this.repo.findOne({
      where: { producto_id, almacen_id },
      relations: ['producto', 'almacen'],
    });
    if (!stock)
      throw new NotFoundException(
        `Stock no encontrado para producto ${producto_id} en almacén ${almacen_id}`,
      );
    return stock;
  }

  async create(dto: CreateStockActualDto): Promise<StockActual> {
    const stock = this.repo.create(dto);
    return this.repo.save(stock);
  }

  async update(
    producto_id: number,
    almacen_id: number,
    dto: UpdateStockActualDto,
  ): Promise<StockActual> {
    await this.repo.update({ producto_id, almacen_id }, dto as any);
    return this.findOne(producto_id, almacen_id);
  }

  async remove(producto_id: number, almacen_id: number): Promise<void> {
    const res = await this.repo.delete({ producto_id, almacen_id });
    if (res.affected === 0)
      throw new NotFoundException(
        `Stock no encontrado para producto ${producto_id} en almacén ${almacen_id}`,
      );
  }

  /**
   * Cambia el stock de un producto en un almacén dado.
   * @param productoId ID del producto a actualizar
   * @param almacenId  ID del almacén
   * @param delta      Positivo para incrementar, negativo para decrementar
   */
  async changeStock(
    productoId: number,
    almacenId: number,
    delta: number,
  ): Promise<StockActual> {
    // 1) Busca la fila existente
    const stock = await this.repo.findOne({
      where: {
        producto: { id: productoId },
        almacen: { id: almacenId },
      },
    });

    if (!stock) {
      throw new NotFoundException(
        `No existe stock para producto ${productoId} en almacén ${almacenId}`,
      );
    }

    // 2) Aplica el cambio y actualiza la fecha
    stock.cantidad += delta;
    stock.last_updated = new Date();

    // 3) Guarda y devuelve el registro actualizado
    return this.repo.save(stock);
  }

  /** Devuelve stock por almacén + precioFinal por producto de ese almacén */
  async getStockByAlmacen(almacenId: number) {
    // 1) Traigo filas de stock con producto y almacén
    const stockPorAlmacen = await this.repo.find({
      where: { almacen: { id: almacenId } },
      relations: ['producto', 'almacen'],
    });

    // 2) Junto IDs únicos de producto
    const productoIds = Array.from(
      new Set(stockPorAlmacen.map(s => s.producto?.id).filter(Boolean)),
    ) as number[];

    // 3) Traigo overrides en batch para este almacén
    const overridesArr = productoIds.length
      ? await this.ppaRepo.find({
          where: { almacen_id: almacenId, producto_id: In(productoIds) },
        })
      : [];

    const mapOverride = new Map<number, number>();
    overridesArr.forEach(o => mapOverride.set(o.producto_id, Number(o.precio)));

    // 4) Enriquezco cada fila con precioFinal y valorFila (precio * cantidad)
    const stockConPrecio = stockPorAlmacen.map(s => {
      const precioBase = (s.producto as any)?.precioBase; // DECIMAL puede venir string
      const precioFinal = this.resolvePrecioFinal(
        s.producto.id,
        precioBase,
        mapOverride,
      );
      // agrego propiedades dinámicas sin tocar el schema
      (s as any).precioFinal = precioFinal;
      (s as any).valorFila = precioFinal * Number(s.cantidad ?? 0);
      return s;
    });

    // 5) Totales por producto (cantidadTotal + precioFinal + valorTotal)
    const totalesMap = new Map<
      number,
      { productoId: number; cantidadTotal: number; precioFinal: number; valorTotal: number }
    >();

    for (const s of stockConPrecio) {
      const pid = s.producto.id;
      const cant = Number(s.cantidad ?? 0);
      const precioFinal = (s as any).precioFinal as number;

      if (totalesMap.has(pid)) {
        const t = totalesMap.get(pid)!;
        t.cantidadTotal += cant;
        t.valorTotal += cant * precioFinal;
        // Si te interesa un precio “representativo” por producto, dejamos el mismo.
        // (Si querés ponderado por lotes, se puede calcular aparte.)
      } else {
        totalesMap.set(pid, {
          productoId: pid,
          cantidadTotal: cant,
          precioFinal,                 // precio resuelto para ese producto en este almacén
          valorTotal: cant * precioFinal,
        });
      }
    }

    const stockTotalPorProducto = Array.from(totalesMap.values());

    return {
      almacenId,
      productosEnAlmacen: stockConPrecio, // cada fila trae precioFinal y valorFila
      stockTotalPorProducto,              // por producto: cantidadTotal, precioFinal, valorTotal
    };
  }


async registrarInsumo(dto: RegistrarInsumoDto): Promise<StockActual> {
  const stock = await this.findOne(dto.producto_id, dto.almacen_id);

  const nombreProducto = stock.producto?.nombre || 'producto';

  // Descontar del stock
  const updated = await this.changeStock(dto.producto_id, dto.almacen_id, -dto.cantidad);

  // Registrar como movimiento tipo "insumo"
  await this.movService.create({
    producto_id: dto.producto_id,
    origen_almacen: dto.almacen_id,
    destino_almacen: undefined,
    cantidad: dto.cantidad,
    tipo: 'insumo',
    motivo: `El producto "${nombreProducto}" fue utilizado como insumo`,
    proveedor_id: undefined,
    precioUnitario: undefined,
    precioTotal: undefined,
  });

  return updated;
}

async cancelarInsumo(dto: CancelarInsumoDto): Promise<StockActual> {
  const movimiento = await this.movService.findOne(dto.movimiento_id);

  if (movimiento.tipo !== 'insumo') {
    throw new Error('Solo se pueden cancelar movimientos de tipo "insumo"');
  }

  if (!movimiento.origen_almacen) {
    throw new Error('El movimiento de insumo no tiene un almacén origen definido');
  }

  // Devolver el stock
  const stockActualizado = await this.changeStock(
    movimiento.producto_id,
    movimiento.origen_almacen,
    movimiento.cantidad,
  );

  // Eliminar el movimiento
  await this.movService.remove(movimiento.id);

  return stockActualizado;
}



}