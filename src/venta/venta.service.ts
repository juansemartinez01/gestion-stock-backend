import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Venta } from './venta.entity';
import { CreateVentaDto } from './dto/create-venta.dto';
import { VentaItem } from './venta-item.entity';
import { ProductoService } from '../producto/producto.service';

import { StockActualService } from '../stock-actual/stock-actual.service';
import { MovimientoStockService } from '../movimiento-stock/movimiento-stock.service';
import { Usuario } from '../usuario/usuario.entity';
import { Promocion } from 'src/promocion/promocion.entity';
import { PromocionService } from 'src/promocion/promocion.service';
import { IngresoVenta } from '../ingreso/ingreso-venta.entity'; // Import the entity (adjust path if needed)
import { EstadisticasVentasDto } from './dto/estadisticas-ventas.dto';
import { Almacen } from 'src/almacen/almacen.entity';
import { UpdateEstadoVentaDto } from './dto/update-estado-venta.dto';

@Injectable()
export class VentaService {
  constructor(
    @InjectRepository(Venta)
    private readonly repo: Repository<Venta>,
    @InjectRepository(IngresoVenta)
    private readonly ingresoVentaRepo: Repository<IngresoVenta>,
    private readonly productoService: ProductoService,
    private readonly stockService: StockActualService,
    private readonly movService: MovimientoStockService,
    private readonly promoService: PromocionService,
    @InjectDataSource() private readonly dataSource: DataSource,
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


    const almacen = await this.dataSource.getRepository(Almacen).findOneBy({ id: dto.almacenId });
    if (!almacen) throw new NotFoundException(`Almacén ${dto.almacenId} no encontrado`);
    // 3) Crear la venta
    const venta = this.repo.create({
      usuario: dto.usuario,
      almacen,
      items,
      total: Number(total.toFixed(2)),
      estado: 'CONFIRMADA',
    });
    const saved = await this.repo.save(venta);

    await this.ingresoVentaRepo.save({
      venta: saved,
      tipo: dto.tipoIngreso, // 'EFECTIVO' o 'BANCARIZADO' → viene en el DTO
      monto: saved.total,
    });


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

  async obtenerTodasConFiltros(
  filtros: {
    fechaDesde?: string;
    fechaHasta?: string;
    usuarioId?: string;
    estado?: string;
    almacenId?: string;
    page?: number;
    limit?: number;
    ordenCampo?: string;
    ordenDireccion?: 'ASC' | 'DESC';
  }
): Promise<{
  data: any[];
  total: number;
  page: number;
  limit: number;
}> {
  const {
    fechaDesde,
    fechaHasta,
    usuarioId,
    almacenId,
    estado,
    page = 1,
    limit = 50,
    ordenCampo = 'fecha',
    ordenDireccion = 'DESC',
  } = filtros;

  const query = this.repo.createQueryBuilder('venta')
    .leftJoin('venta.usuario', 'usuario')
    .leftJoin('venta.items', 'items')
    .leftJoin('items.producto', 'producto')
    .leftJoin('producto.unidad', 'unidad')
    .leftJoin('producto.categoria', 'categoria')
    .leftJoin('venta.almacen', 'almacen')
    .select([
      'venta.id',
      'venta.fecha',
      'venta.total',
      'venta.estado',

      'usuario.id',
      'usuario.nombre',

      'items.id',
      'items.cantidad',
      'items.precioUnitario',
      'items.subtotal',

      'producto.id',
      'producto.nombre',
      'producto.descripcion',
      'producto.barcode',
      'producto.precioBase',

      'unidad.nombre',
      'categoria.nombre',

      'almacen.id',
      'almacen.nombre',
    ])
    .skip((page - 1) * limit)
    .take(limit);

  if (fechaDesde) {
    query.andWhere('venta.fecha >= :fechaDesde', { fechaDesde: new Date(fechaDesde) });
  }

  if (fechaHasta) {
    query.andWhere('venta.fecha <= :fechaHasta', { fechaHasta: new Date(fechaHasta) });
  }

  if (usuarioId) {
    query.andWhere('usuario.id = :usuarioId', { usuarioId });
  }

  if (estado) {
    const estados = estado.split(',').map(e => e.trim()).filter(Boolean);
    if (estados.length > 0) {
      query.andWhere('venta.estado IN (:...estados)', { estados });
    }
  }

  if (almacenId) {
  const almacenIdNum = parseInt(almacenId, 10);
  if (!isNaN(almacenIdNum)) {
    query.andWhere('almacen.id = :almacenId', { almacenId: almacenIdNum });
  }
}


  const camposValidos = ['fecha', 'id', 'estado'];
  const campoOrdenFinal = camposValidos.includes(ordenCampo) ? ordenCampo : 'fecha';

  query.orderBy(`venta.${campoOrdenFinal}`, ordenDireccion);

  const [ventas, total] = await query.getManyAndCount();

  return {
    data: ventas,
    total,
    page,
    limit,
  };
}


async obtenerEstadisticasVentas(filtros: EstadisticasVentasDto) {
    const { fechaDesde, fechaHasta } = filtros;
    const condiciones = [];
    if (fechaDesde) condiciones.push(`v.fecha >= '${fechaDesde}'`);
    if (fechaHasta) condiciones.push(`v.fecha <= '${fechaHasta}'`);
    const whereClause = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

    // Ingresos totales y total ventas
    const resumen = await this.dataSource.query(`
      SELECT 
        COALESCE(SUM(v.total), 0)::FLOAT AS "ingresosTotales",
        COUNT(*) AS "totalVentas"
      FROM venta v
      ${whereClause};
    `);

    const { ingresosTotales, totalVentas } = resumen[0];

    // Productos agregados
    const productos = await this.dataSource.query(`
      SELECT 
        p.id,
        p.descripcion AS nombre,
        p.sku,
        SUM(vi.cantidad)::INTEGER AS "cantidadVendida",
        SUM(vi.subtotal)::FLOAT AS ingresos
      FROM venta_item vi
      JOIN producto p ON p.id = vi.producto_id
      JOIN venta v ON v.id = vi.venta_id
      ${whereClause}
      GROUP BY p.id
    `);

    const productoMasVendido = productos.reduce((max: { cantidadVendida: number; }, p: { cantidadVendida: number; }) =>
      p.cantidadVendida > max.cantidadVendida ? p : max, productos[0] || null);

    const productoMasIngresos = productos.reduce((max: { ingresos: number; }, p: { ingresos: number; }) =>
      p.ingresos > max.ingresos ? p : max, productos[0] || null);

    const topProductosCantidad = [...productos]
      .sort((a, b) => b.cantidadVendida - a.cantidadVendida)
      .slice(0, 5);

    const topProductosIngresos = [...productos]
      .sort((a, b) => b.ingresos - a.ingresos)
      .slice(0, 5);

    const ventasPorDia = await this.dataSource.query(`
      SELECT 
        TO_CHAR(v.fecha, 'YYYY-MM-DD') AS fecha,
        COUNT(*)::INTEGER AS cantidad,
        SUM(v.total)::FLOAT AS ingresos
      FROM venta v
      ${whereClause}
      GROUP BY 1
      ORDER BY 1;
    `);

    const promedioVenta = totalVentas > 0 ? ingresosTotales / totalVentas : 0;

    return {
      ingresosTotales,
      totalVentas,
      promedioVenta,
      productoMasVendido,
      productoMasIngresos,
      topProductosCantidad,
      topProductosIngresos,
      ventasPorDia,
    };
  }

  // src/venta/venta.service.ts
async actualizarEstado(id: number, dto: UpdateEstadoVentaDto): Promise<Venta> {
  const venta = await this.repo.findOneBy({ id });

  if (!venta) {
    throw new Error(`No se encontró una venta con ID ${id}`);
  }

  venta.estado = dto.estado;

  return this.repo.save(venta);
}


}
