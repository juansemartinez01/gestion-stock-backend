// src/orden-compra/orden-compra.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { OrdenCompra } from './orden-compra.entity';
import { OrdenCompraItem } from './orden-compra-item.entity';
import { CreateOrdenCompraDto } from './dto/create-orden-compra.dto';
import { ProveedorService } from '../proveedor/proveedor.service';
import { ProductoService } from '../producto/producto.service';
import { MovimientoStock } from 'src/movimiento-stock/movimiento-stock.entity';
import { StockActual } from 'src/stock-actual/stock-actual.entity';
import { FiltroOrdenCompraDto } from './dto/filtro-orden-compra.dto';



@Injectable()
export class OrdenCompraService {
  constructor(
    @InjectRepository(OrdenCompra)
    private ordenRepo: Repository<OrdenCompra>,

    @InjectRepository(OrdenCompraItem)
    private itemRepo: Repository<OrdenCompraItem>,

    private proveedorService: ProveedorService,
    private productoService: ProductoService,

    private dataSource: DataSource,
  ) {}

  async crearOrdenConStock(dto: CreateOrdenCompraDto) {
  return await this.dataSource.transaction(async manager => {
    const { proveedorId, almacenId, usuarioId, items } = dto;

    // 1. Crear orden de compra
    const orden = manager.create(OrdenCompra, {
      proveedor: { id: proveedorId },
      fecha: new Date(),
      total: items.reduce((sum, i) => sum + i.precioUnitario * i.cantidad, 0),
    });
    await manager.save(orden);

    for (const item of items) {
      const { productoId, cantidad, precioUnitario } = item;
      const subtotal = cantidad * precioUnitario;

      // 2. Crear orden_compra_item
      const ordenItem = manager.create(OrdenCompraItem, {
        orden: orden,
        producto: { id: productoId },
        cantidad,
        precioUnitario,
        subtotal,
      });
      await manager.save(ordenItem);

      // 3. Registrar movimiento de stock
      const movimiento = manager.create(MovimientoStock, {
        producto_id: productoId,
        destino_almacen: almacenId,
        cantidad,
        tipo: 'entrada',
        usuario_id: usuarioId,
        proveedor_id: proveedorId,
        precioUnitario,
        precioTotal: subtotal,
        motivo: 'Ingreso por orden de compra'
      });
      await manager.save(movimiento);


      // 4. Actualizar stock_actual
      const stock = await manager.findOne(StockActual, {
        where: {
          producto: { id: productoId },
          almacen: { id: almacenId },
        },
      });

      if (stock) {
        stock.cantidad += cantidad;
        stock.last_updated = new Date();
        await manager.save(stock);
      } else {
        const nuevoStock = manager.create(StockActual, {
          producto: { id: productoId },
          almacen: { id: almacenId },
          cantidad,
          lastUpdated: new Date(),
        });
        await manager.save(nuevoStock);
      }
    }

    return { mensaje: 'Stock ingresado y orden de compra registrada', ordenId: orden.id };
  });
}

  async obtenerDetalle(id: number) {
    const orden = await this.ordenRepo.findOne({
      where: { id },
      relations: [
        'proveedor',
        'items',
        'items.producto',
      ],
    });

    if (!orden) {
      throw new NotFoundException(`Orden de compra ${id} no encontrada`);
    }

    return orden;
  }

async obtenerTodasConFiltros(filtros: FiltroOrdenCompraDto) {
  const pagina = filtros.pagina ?? 1;
  const limite = filtros.limite ?? 50;

  const query = this.ordenRepo.createQueryBuilder('orden')
    .leftJoin('orden.proveedor', 'proveedor')
    .leftJoin('orden.items', 'items')
    .leftJoin('items.producto', 'producto')
    .leftJoin('producto.unidad', 'unidad')
    .leftJoin('producto.categoria', 'categoria')
    .select([
      'orden.id',
      'orden.fecha',
      'orden.total',
      'proveedor.id',
      'proveedor.nombre',
      'items.id',
      'items.cantidad',
      'items.precioUnitario',
      'items.subtotal',
      'producto.id',
      'producto.nombre',
      'unidad.id',
      'unidad.nombre',
      'categoria.id',
      'categoria.nombre',
    ]);

  if (filtros.fechaDesde) {
    query.andWhere('orden.fecha >= :fechaDesde', { fechaDesde: filtros.fechaDesde });
  }

  if (filtros.fechaHasta) {
    query.andWhere('orden.fecha <= :fechaHasta', { fechaHasta: filtros.fechaHasta });
  }

  if (filtros.proveedorId) {
    query.andWhere('proveedor.id = :proveedorId', { proveedorId: filtros.proveedorId });
  }

  const [data, total] = await query
    .orderBy('orden.fecha', 'DESC')
    .skip((pagina - 1) * limite)
    .take(limite)
    .getManyAndCount();

  const resultado = data.map((orden) => ({
    id: orden.id,
    fecha: orden.fecha,
    total: orden.total,
    proveedor: {
      id: orden.proveedor.id,
      nombre: orden.proveedor.nombre,
    },
    items: orden.items.map((item) => ({
      id: item.id,
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario,
      subtotal: item.subtotal,
      producto: {
        id: item.producto.id,
        nombre: item.producto.nombre,
        unidad_id: item.producto.unidad?.id,
        unidad_nombre: item.producto.unidad?.nombre,
        categoria_id: item.producto.categoria?.id,
        categoria_nombre: item.producto.categoria?.nombre,
      },
    })),
  }));

  return {
    data: resultado,
    total,
    pagina,
    limite,
    totalPaginas: Math.ceil(total / limite),
  };
}




  findAll(): Promise<OrdenCompra[]> {
    return this.ordenRepo.find({
      relations: ['proveedor', 'items', 'items.producto'],
    });
  }

  async findOne(id: number): Promise<OrdenCompra> {
    const orden = await this.ordenRepo.findOne({
      where: { id },
      relations: ['proveedor', 'items', 'items.producto'],
    });
    if (!orden) {
      throw new Error(`OrdenCompra with id ${id} not found`);
    }
    return orden;
  }

  

}
