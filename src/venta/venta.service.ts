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
import { Promocion } from 'src/promocion/promocion.entity';
import { PromocionService } from 'src/promocion/promocion.service';

@Injectable()
export class VentaService {
  constructor(
    @InjectRepository(Venta)
    private readonly repo: Repository<Venta>,
    private readonly productoService: ProductoService,
    private readonly stockService: StockActualService,
    private readonly movService: MovimientoStockService,
    private readonly promoService: PromocionService,
  ) {}

  
  async create(dto: CreateVentaDto & { usuario: Usuario }) {
  const items: VentaItem[] = [];
  let total = 0;

  // 1) Arma los items de productos individuales
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

  // 2) Procesar promociones
  if (dto.promociones) {
    for (const promoItem of dto.promociones) {
      const promo = await this.promoService.getPromocionById(promoItem.promocionId);
      if (!promo) throw new NotFoundException(`Promoción ${promoItem.promocionId} no encontrada`);

      const subtotal = Number((promo.precioPromo * promoItem.cantidad).toFixed(2));
      total += subtotal;

      for (const p of promo.productos) {
        const ventaItem = new VentaItem();
        ventaItem.producto = p.producto;
        ventaItem.cantidad = p.cantidad * promoItem.cantidad;
        ventaItem.precioUnitario = 0; // o podés calcular un proporcional si querés
        ventaItem.subtotal = 0; // no suma por separado
        items.push(ventaItem);
      }

      // Podés agregar un "ítem visual" representando la promo como un producto virtual si querés.
    }
  }

  // 3) Crear la venta
  const venta = this.repo.create({
    usuario: dto.usuario,
    items,
    total: Number(total.toFixed(2)),
    estado: 'CONFIRMADA',
  });
  const saved = await this.repo.save(venta);

  // 4) Actualizar stock y movimientos
  for (const it of items) {
    await this.stockService.changeStock(it.producto.id, dto.almacenId, -it.cantidad);
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