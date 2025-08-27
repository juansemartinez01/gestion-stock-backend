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

@Injectable()
export class StockActualService {
  constructor(
    @InjectRepository(StockActual)
    private readonly repo: Repository<StockActual>,
    @InjectRepository(Producto)
    private readonly prodRepo: Repository<Producto>,
    private readonly movService: MovimientoStockService,
  ) {}

  findAll(): Promise<StockActual[]> {
    return this.repo.find({ relations: ['producto', 'almacen'] });
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
      // NUEVO si actualizás MovimientoStock:
      cantidad_gramos: producto.es_por_gramos ? dto.cantidad_gramos : undefined,
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
  // Armamos un payload explícito para una sola fila
  const payload: DeepPartial<StockActual> = {
    producto_id: dto.producto_id,
    almacen_id: dto.almacen_id,
    // Si viene piezas, usamos piezas; si viene gramos, dejamos piezas en 0.
    cantidad: dto.cantidad ?? 0,
    // NUMERIC en PG → string en TypeORM; si no viene, NULL
    cantidad_gramos:
      dto.cantidad_gramos !== undefined
        ? dto.cantidad_gramos.toString()
        : null,
  };

  const entity = this.repo.create(payload); // ← create de una sola entidad (no array)
  return await this.repo.save(entity);      // ← save devuelve StockActual, no array
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
  const stockPorAlmacen = await this.repo.find({
    where: { almacen: { id: almacenId } },
    relations: ['producto', 'almacen'],
  });

  // Suma normalizada por producto (pieces → int, grams → numeric)
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

  const stockTotalPorProducto = rows.map(r => ({
    productoId: Number(r.productoId),
    es_por_gramos: r.es_por_gramos === true || r.es_por_gramos === 'true',
    cantidadTotal: Number(r.cantidadTotal),
  }));

  return {
    almacenId,
    productosEnAlmacen: stockPorAlmacen,
    stockTotalPorProducto, // cantidadTotal en piezas o gramos según el producto
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
      cantidad_gramos: producto.es_por_gramos ? dto.cantidad_gramos : undefined,
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

  // Lock pesimista de la fila a actualizar
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
    const nuevo = actual + delta;
    if (nuevo < 0) throw new Error('Stock insuficiente (gramos)');
    row.cantidad_gramos = nuevo.toString(); // NUMERIC → string
    row.cantidad = 0;
  } else {
    const delta = Number(opts.deltaPiezas ?? 0);
    const actual = Number(row.cantidad ?? 0);
    const nuevo = actual + delta;
    if (nuevo < 0) throw new Error('Stock insuficiente (piezas)');
    row.cantidad = nuevo;
    row.cantidad_gramos = null;
  }

  row.last_updated = new Date();
  return stockRepo.save(row);
}


}