import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, EntityManager, Repository } from 'typeorm';
import { StockActual } from './stock-actual.entity';
import { CreateStockActualDto } from './dto/create-stock-actual.dto';
import { UpdateStockActualDto } from './dto/update-stock-actual.dto';
import { MovimientoStockService } from 'src/movimiento-stock/movimiento-stock.service';
import { RegistrarInsumoDto } from './dto/registrar-insumo.dto';
import { CancelarInsumoDto } from './dto/cancelar-insumo.dto';
import { Producto } from 'src/producto/producto.entity';
// arriba, junto con los existentes
import { In } from 'typeorm';
import { ProductoPrecioAlmacen } from 'src/producto-precio-almacen/producto-precio-almacen.entity';


@Injectable()
export class StockActualService {
  constructor(
    @InjectRepository(StockActual)
    private readonly repo: Repository<StockActual>,
    @InjectRepository(Producto)
    private readonly prodRepo: Repository<Producto>,
    private readonly movService: MovimientoStockService,
    @InjectRepository(ProductoPrecioAlmacen)
  private readonly ppaRepo: Repository<ProductoPrecioAlmacen>,
  ) {}

  // Convierte DECIMAL(string) a number seguro
private toNumber(n: any): number {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

// Resuelve precio final: override (si existe) o precioBase
private resolvePrecioFinal(
  productoId: number,
  almacenId: number,
  precioBase: any,
  overrides: Map<string, number>, // key = `${productoId}:${almacenId}`
): number {
  const k = `${productoId}:${almacenId}`;
  if (overrides.has(k)) return this.toNumber(overrides.get(k));
  return this.toNumber(precioBase ?? 0);
}
  async findAll(): Promise<StockActual[]> {
  // Traigo stock con relaciones (necesitamos producto.precioBase y producto.es_por_gramos)
  const rows = await this.repo.find({ relations: ['producto', 'almacen'] });
  if (!rows.length) return rows;

  // IDs únicos para buscar overrides en lote
  const productoIds = Array.from(new Set(rows.map(r => r.producto_id)));
  const almacenIds  = Array.from(new Set(rows.map(r => r.almacen_id)));

  // Overrides por (producto, almacén)
  const overridesArr = await this.ppaRepo.find({
    where: { producto_id: In(productoIds), almacen_id: In(almacenIds) },
  });
  const ovMap = new Map<string, number>();
  for (const o of overridesArr) {
    ovMap.set(`${o.producto_id}:${o.almacen_id}`, this.toNumber(o.precio));
  }

  // Enriquecer cada fila con precioFinal y valorFila
  for (const r of rows) {
    const prod: any = r.producto;
    const precioFinal = this.resolvePrecioFinal(r.producto_id, r.almacen_id, prod?.precioBase, ovMap);
    (r as any).precioFinal = precioFinal;

    const esGr = prod?.es_por_gramos === true;
    const qtyNormalizada = esGr
      ? this.toNumber(r.cantidad_gramos) / 1000 // gramos → kg
      : this.toNumber(r.cantidad);              // piezas

    (r as any).valorFila = this.toNumber(precioFinal) * qtyNormalizada;
  }

  return rows;
}


  async registrarEntrada(dto: CreateStockActualDto): Promise<StockActual> {
  return this.repo.manager.transaction(async (m) => {
    const producto = await m.getRepository(Producto).findOne({
      where: { id: dto.producto_id },
      select: ['id', 'es_por_gramos'],
    });
    if (!producto) throw new NotFoundException(`Producto ${dto.producto_id} no existe`);

    const updated = await this.ajustarStockTx(m, dto.producto_id, dto.almacen_id, {
      deltaPiezas: !producto.es_por_gramos ? (dto.cantidad ?? 0) : 0,
      deltaGramos:  producto.es_por_gramos  ? (dto.cantidad_gramos ?? 0) : 0,
    });

    // ⚠️ Recomendado: extender MovimientoStock para soportar cantidad_gramos
    await this.movService.create({
      producto_id: dto.producto_id,
      origen_almacen: undefined,
      destino_almacen: dto.almacen_id,
      cantidad: !producto.es_por_gramos ? dto.cantidad : undefined,
      cantidad_gramos: producto.es_por_gramos && dto.cantidad_gramos !== undefined
      ? Number(dto.cantidad_gramos) // ✅ number
      : undefined,
      tipo: 'entrada',
      motivo: dto.motivo || 'Reposición de stock',
      proveedor_id: dto.proveedor_id,
      precioUnitario: dto.precioUnitario,
      precioTotal: dto.precioTotal,
    });


    return updated;
  });
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
  const payload: DeepPartial<StockActual> = {
    producto_id: dto.producto_id,
    almacen_id: dto.almacen_id,
    cantidad: dto.cantidad ?? 0,
    cantidad_gramos:
      dto.cantidad_gramos !== undefined
        ? Number(dto.cantidad_gramos).toFixed(3) // 👈 normalizado
        : null,
  };

  const entity = this.repo.create(payload);
  return await this.repo.save(entity);
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
  // REEMPLAZAR changeStock por:
async changeStock(
  productoId: number,
  almacenId: number,
  opts: { deltaPiezas?: number; deltaGramos?: number },
): Promise<StockActual> {
  return this.repo.manager.transaction(async (m) => {
    return this.ajustarStockTx(m, productoId, almacenId, opts);
  });
}


  // MODIFICAR getStockByAlmacen
async getStockByAlmacen(almacenId: number) {
  // Helper local para números seguros (DECIMAL puede venir string)
  const toNumber = (n: any) => {
    const v = Number(n);
    return Number.isFinite(v) ? v : 0;
  };

  // 1) Filas detalladas con relaciones (producto/almacen)
  const stockPorAlmacen = await this.repo.find({
    where: { almacen: { id: almacenId } },
    relations: ['producto', 'almacen'],
  });

  // 2) Tu suma normalizada por producto (piezas → int, gramos → numeric)
  const rows = await this.repo.createQueryBuilder('stock')
    .innerJoin('stock.producto', 'p')
    .select('stock.producto_id', 'productoId')
    .addSelect('p.es_por_gramos', 'es_por_gramos')
    .addSelect(`
      SUM(
        CASE WHEN p.es_por_gramos
             THEN COALESCE(stock.cantidad_gramos, 0)::numeric
             ELSE COALESCE(stock.cantidad, 0)::numeric
        END
      )
    `, 'cantidadTotal')
    .where('stock.almacen_id = :almacenId', { almacenId })
    .groupBy('stock.producto_id')
    .addGroupBy('p.es_por_gramos')
    .getRawMany();

  // Base: tus campos actuales (cantidadTotal en piezas o gramos según producto)
  const baseTotales = rows.map(r => ({
    productoId: Number(r.productoId),
    es_por_gramos: r.es_por_gramos === true || r.es_por_gramos === 'true',
    cantidadTotal: Number(r.cantidadTotal),
  }));

  // 3) Overrides de precio por (producto, almacén) para este almacén
  const productoIds = baseTotales.map(x => x.productoId);
  const overridesArr = productoIds.length
    ? await this.ppaRepo.find({
        where: { almacen_id: almacenId, producto_id: In(productoIds) },
      })
    : [];

  // Map de override por productoId (en este almacén)
  const overridePorProducto = new Map<number, number>();
  for (const o of overridesArr) {
    overridePorProducto.set(o.producto_id, toNumber(o.precio));
  }

  // Map rápido de producto por id desde las filas detalladas
  const prodById = new Map<number, any>();
  for (const s of stockPorAlmacen) {
    if (s.producto) prodById.set(s.producto.id, s.producto as any);
  }

  // 4) Enriquecer cada fila DETALLADA con precioFinal y valorFila
  for (const s of stockPorAlmacen) {
    const prod: any = s.producto || {};
    const pid = prod?.id;
    const precioBase = toNumber(prod?.precioBase);
    const precioFinal = overridePorProducto.has(pid)
      ? toNumber(overridePorProducto.get(pid))
      : precioBase;

    (s as any).precioFinal = precioFinal;

    // Normalizo cantidad facturable: piezas o kg (gramos / 1000)
    const esGr = prod?.es_por_gramos === true;
    const qtyNorm = esGr ? toNumber(s.cantidad_gramos) / 1000 : toNumber(s.cantidad);

    (s as any).valorFila = toNumber(precioFinal) * qtyNorm;
  }

  // 5) Enriquecer el RESUMEN por producto con precioFinal y valorTotal
  const stockTotalPorProducto = baseTotales.map(row => {
    const prod: any = prodById.get(row.productoId) || {};
    const precioBase = toNumber(prod?.precioBase);

    const precioFinal = overridePorProducto.has(row.productoId)
      ? toNumber(overridePorProducto.get(row.productoId))
      : precioBase;

    // cantidad facturable en unidades de precio: piezas o kg
    const cantidadFact = row.es_por_gramos
      ? toNumber(row.cantidadTotal) / 1000 // gramos → kg
      : toNumber(row.cantidadTotal);       // piezas

    const valorTotal = toNumber(precioFinal) * cantidadFact;

    return {
      ...row,
      precioFinal,
      valorTotal,
    };
  });

  return {
    almacenId,
    productosEnAlmacen: stockPorAlmacen, // ahora trae precioFinal y valorFila
    stockTotalPorProducto,               // ahora trae precioFinal y valorTotal
  };
}



// MODIFICAR registrarInsumo (su DTO debería aceptar cantidad o cantidad_gramos)
async registrarInsumo(dto: RegistrarInsumoDto): Promise<StockActual> {
  return this.repo.manager.transaction(async (m) => {
    const producto = await m.getRepository(Producto).findOne({
      where: { id: dto.producto_id },
      select: ['id', 'es_por_gramos'],
    });
    if (!producto) throw new NotFoundException(`Producto ${dto.producto_id} no existe`);

    const stock = await m.getRepository(StockActual).findOne({
      where: { producto_id: dto.producto_id, almacen_id: dto.almacen_id },
      relations: ['producto', 'almacen'],
    });
    if (!stock) throw new NotFoundException(`Stock no encontrado para producto ${dto.producto_id} en almacén ${dto.almacen_id}`);

    const nombreProducto = stock.producto?.nombre || 'producto';

    const updated = await this.ajustarStockTx(m, dto.producto_id, dto.almacen_id, {
      deltaPiezas: !producto.es_por_gramos ? -(dto.cantidad ?? 0) : 0,
      deltaGramos:  producto.es_por_gramos  ? -(dto.cantidad_gramos ?? 0) : 0,
    });

    await this.movService.create({
    producto_id: dto.producto_id,
    origen_almacen: dto.almacen_id,
    destino_almacen: undefined,
    cantidad: !producto.es_por_gramos ? dto.cantidad : undefined,
    cantidad_gramos: producto.es_por_gramos && dto.cantidad_gramos !== undefined
      ? Number(dto.cantidad_gramos) // ✅ number
      : undefined,
    tipo: 'insumo',
    motivo: `El producto "${nombreProducto}" fue utilizado como insumo`,
  });


    return updated;
  });
}

// MODIFICAR cancelarInsumo
async cancelarInsumo(dto: CancelarInsumoDto): Promise<StockActual> {
  return this.repo.manager.transaction(async (m) => {
    const movimiento = await this.movService.findOne(dto.movimiento_id);

    if (movimiento.tipo !== 'insumo') {
      throw new Error('Solo se pueden cancelar movimientos de tipo "insumo"');
    }
    if (!movimiento.origen_almacen) {
      throw new Error('El movimiento de insumo no tiene un almacén origen definido');
    }

    // Si extendiste MovimientoStock con cantidad_gramos, usalo para revertir correctamente
    const updated = await this.ajustarStockTx(m, movimiento.producto_id, movimiento.origen_almacen, {
      deltaPiezas: movimiento.cantidad ?? 0,
      deltaGramos: movimiento.cantidad_gramos !== undefined && movimiento.cantidad_gramos !== null ? Number(movimiento.cantidad_gramos) : 0, // NUEVO
    });

    await this.movService.remove(movimiento.id);
    return updated;
  });
}








// NUEVO helper
private async ajustarStockTx(
  m: EntityManager,
  productoId: number,
  almacenId: number,
  opts: { deltaPiezas?: number; deltaGramos?: number }
): Promise<StockActual> {
  const producto = await m.getRepository(Producto).findOne({
    where: { id: productoId },
    select: ['id', 'es_por_gramos'],
  });
  if (!producto) {
    throw new NotFoundException(`Producto ${productoId} no existe`);
  }

  // Crea la fila si no existe
  await m.query(
    `INSERT INTO stock_actual (producto_id, almacen_id, cantidad, cantidad_gramos)
     VALUES ($1,$2,0,NULL)
     ON CONFLICT (producto_id, almacen_id) DO NOTHING`,
    [productoId, almacenId],
  );

  // Lock pesimista
  const stockRepo = m.getRepository(StockActual);
  const row = await stockRepo.createQueryBuilder('s')
    .where('s.producto_id = :productoId AND s.almacen_id = :almacenId', { productoId, almacenId })
    .setLock('pessimistic_write')
    .getOne();

  if (!row) {
    throw new NotFoundException(`No existe stock para producto ${productoId} en almacén ${almacenId}`);
  }

  if (producto.es_por_gramos) {
    const delta = Number(opts.deltaGramos ?? 0);
    const actual = Number(row.cantidad_gramos ?? 0);
    const nuevo = actual + delta;         // ✅ puede quedar negativo
    row.cantidad_gramos = nuevo.toFixed(3); // NUMERIC como string con 3 decimales
    row.cantidad = 0;                     // por consistencia, piezas en 0
  } else {
    const delta = Number(opts.deltaPiezas ?? 0);
    const actual = Number(row.cantidad ?? 0);
    const nuevo = actual + delta;         // ✅ puede quedar negativo
    row.cantidad = nuevo;
    row.cantidad_gramos = null;           // por consistencia, gramos null
  }

  // @UpdateDateColumn actualiza solo; no es necesario setear manualmente
  return stockRepo.save(row);
}


}