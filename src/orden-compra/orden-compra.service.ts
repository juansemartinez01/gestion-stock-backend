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

async obtenerTodasConFiltros(filtros: {
  fechaDesde?: string;
  fechaHasta?: string;
  proveedorId?: string;
}) {
  const query = this.ordenRepo.createQueryBuilder('orden')
    .leftJoinAndSelect('orden.proveedor', 'proveedor')
    .leftJoinAndSelect('orden.items', 'items')
    .leftJoinAndSelect('items.producto', 'producto');

  if (filtros.fechaDesde) {
    query.andWhere('orden.fecha >= :fechaDesde', { fechaDesde: filtros.fechaDesde });
  }

  if (filtros.fechaHasta) {
    query.andWhere('orden.fecha <= :fechaHasta', { fechaHasta: filtros.fechaHasta });
  }

  if (filtros.proveedorId) {
    query.andWhere('proveedor.id = :proveedorId', { proveedorId: filtros.proveedorId });
  }

  return await query.orderBy('orden.fecha', 'DESC').getMany();
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
