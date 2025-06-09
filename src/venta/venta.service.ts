import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Venta } from './venta.entity';
import { CreateVentaDto } from './dto/create-venta.dto';
import { VentaItem } from './venta-item.entity';
import { ProductoService } from '../producto/producto.service';

import { StockActualService } from '../stock-actual/stock-actual.service';
import { MovimientoStockService } from '../movimiento-stock/movimiento-stock.service';
import { Usuario } from '../usuario/usuario.entity';

@Injectable()
export class VentaService {
  constructor(
    @InjectRepository(Venta)
    private readonly repo: Repository<Venta>,
    private readonly productoService: ProductoService,
    private readonly stockService: StockActualService,
    private readonly movService: MovimientoStockService,
  ) {}

  
  async create(dto: CreateVentaDto & { usuario: Usuario }) {
    const items: VentaItem[] = [];
    let total = 0;

    // 1) Arma los items y calcula total
    for (const it of dto.items) {
      const producto = await this.productoService.findOne(it.productoId);
      if (!producto) throw new NotFoundException(`Producto ${it.productoId} no encontrado`);

      const subtotal = Number((it.cantidad * it.precioUnitario).toFixed(2));
      total += subtotal;

      const ventaItem = new VentaItem();
      ventaItem.producto = producto;
      ventaItem.cantidad = it.cantidad;
      ventaItem.precioUnitario = it.precioUnitario;
      ventaItem.subtotal = subtotal;
      items.push(ventaItem);
    }

    // 2) Crea la venta en estado CONFIRMADA
    const venta = this.repo.create({
      usuario: dto.usuario,
      items,
      total: Number(total.toFixed(2)),
      estado: 'CONFIRMADA',
    });
    const saved = await this.repo.save(venta);

    // 3) Por cada item, descuenta stock y registra movimiento
    for (const it of items) {
      // a) Descontar stock
      await this.stockService.changeStock(
        it.producto.id,
        dto.almacenId,
        -it.cantidad,   // decremento
      );

      // b) Crear movimiento de stock
      await this.movService.create({
        producto_id: it.producto.id,
        origen_almacen: dto.almacenId,
        destino_almacen: undefined,
        cantidad: it.cantidad,
        tipo: 'salida',
        motivo: `Venta #${saved.id}`,
      });
    }

    return saved;
  }

  findAll(): Promise<Venta[]> {
    return this.repo.find();
  }

  async findOne(id: number): Promise<Venta> {
    const venta = await this.repo.findOne({ where: { id } });
    if (!venta) {
      throw new NotFoundException(`Venta with ID ${id} not found`);
    }
    return venta;
  }
}