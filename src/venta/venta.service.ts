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
import { CreateVentaMixtaDto } from './dto/create-venta-mixta.dto';
import moment from 'moment-timezone';






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

  // 1) Armar items
  for (const it of dto.items) {
    const producto = await this.productoService.findOne(it.productoId);
    if (!producto) throw new NotFoundException(`Producto ${it.productoId} no encontrado`);

    const granel = this.isGranel(producto);

    // validar XOR según el tipo
    if (granel) {
      if (it.cantidad_gramos === undefined) {
        throw new Error(`Producto ${producto.id} se vende por gramos: enviar "cantidad_gramos"`);
      }
    } else {
      if (it.cantidad === undefined) {
        throw new Error(`Producto ${producto.id} se vende por piezas: enviar "cantidad"`);
      }
    }

    // calcular subtotal
    const cantidadKg = granel ? (Number(it.cantidad_gramos) / 1000) : 0;
    const cantidadPzas = granel ? 0 : Number(it.cantidad);
    const unidadesFacturadas = granel ? cantidadKg : cantidadPzas; // kg ó unidades
    const subtotal = this.to2(unidadesFacturadas * Number(it.precioUnitario));
    total += subtotal;

    // crear item
    const vi = new VentaItem();
    vi.producto = producto;
    vi.cantidad = granel ? null : cantidadPzas;
    vi.cantidad_gramos = granel ? this.to3(Number(it.cantidad_gramos)).toFixed(3) : null;
    vi.precioUnitario = Number(it.precioUnitario);
    vi.subtotal = subtotal;

    items.push(vi);
  }

  // 2) Promociones (mismo concepto, setear piezas/gramos según producto)
  if (dto.promociones) {
    for (const promoItem of dto.promociones) {
      const promo = await this.promoService.getPromocionById(promoItem.promocionId);
      if (!promo) throw new NotFoundException(`Promoción ${promoItem.promocionId} no encontrada`);

      // item "promo" como renglón de cobro
      const subtotalPromo = this.to2(promo.precioPromo * promoItem.cantidad);
      total += subtotalPromo;

      const promoVentaItem = new VentaItem();
      promoVentaItem.producto = null;
      promoVentaItem.cantidad = promoItem.cantidad;
      promoVentaItem.cantidad_gramos = null;
      promoVentaItem.precioUnitario = promo.precioPromo;
      promoVentaItem.subtotal = subtotalPromo;
      items.push(promoVentaItem);

      // detallar los productos de la promo (sin precio)
      for (const p of promo.productos) {
        const granel = this.isGranel(p.producto);
        const vi = new VentaItem();
        vi.producto = p.producto;
        vi.precioUnitario = 0;
        vi.subtotal = 0;

        if (granel) {
          // si tu pivot de promo tiene gramos, usar p.gramos; de lo contrario, definilo
          const gramosTot = Number(Number(p.cantidad_gramos ?? 0) * promoItem.cantidad);
          vi.cantidad = null;
          vi.cantidad_gramos = this.to3(gramosTot).toFixed(3);
        } else {
          vi.cantidad = (p.cantidad ?? 0) * promoItem.cantidad;
          vi.cantidad_gramos = null;
        }
        items.push(vi);
      }
    }
  }

  // 3) Venta + ingreso
  const almacen = await this.dataSource.getRepository(Almacen).findOneBy({ id: dto.almacenId });
  if (!almacen) throw new NotFoundException(`Almacén ${dto.almacenId} no encontrado`);

  const venta = this.repo.create({
    usuario: dto.usuario,
    almacen,
    items,
    total: this.to2(total),
    estado: 'CONFIRMADA',
    fecha: moment().tz('America/Argentina/Buenos_Aires').toDate(),
  });
  const saved = await this.repo.save(venta);

  await this.ingresoVentaRepo.save({
    venta: saved,
    tipo: dto.tipoIngreso, // 'EFECTIVO' | 'BANCARIZADO'
    monto: saved.total,
  });

  // 4) Stock + movimientos (piezas/gramos)
  for (const it of items) {
    if (!it.producto) continue; // el renglón de promo no descuenta

    const piezas = it.cantidad ?? 0;
    const gramos = Number(it.cantidad_gramos ?? 0);

    await this.stockService.changeStock(it.producto.id, dto.almacenId, {
      deltaPiezas: piezas ? -piezas : 0,
      deltaGramos: gramos ? -gramos : 0,
    });

    await this.movService.create({
      producto_id: it.producto.id,
      origen_almacen: dto.almacenId,
      destino_almacen: undefined,
      cantidad: piezas || undefined,
      cantidad_gramos: (typeof gramos === 'number' && gramos > 0)
    ? Number(gramos.toFixed(3))                                             // number (no string)
    : undefined,

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
    tipo?: 'EFECTIVO' | 'BANCARIZADO'; // ✅ nuevo
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
    tipo, // ✅ nuevo
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
    .leftJoin('venta.ingresos', 'ingreso') // 👈 importante para acceder a tipo
    .select([
      'venta.id',
      'venta.fecha',
      'venta.total',
      'venta.estado',

      'usuario.id',
      'usuario.nombre',

      'items.id',
      'items.cantidad',
      'items.cantidad_gramos',
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

      'ingreso.tipo', // opcional si querés verlo
      'ingreso.monto'
    ])
    .skip((page - 1) * limit)
    .take(limit);

  if (fechaDesde) {
  const fechaDesdeUtc = moment.tz(fechaDesde, 'America/Argentina/Buenos_Aires').startOf('day').utc().toDate();
  query.andWhere('venta.fecha >= :fechaDesde', { fechaDesde: fechaDesdeUtc });
}

if (fechaHasta) {
  const fechaHastaUtc = moment.tz(fechaHasta, 'America/Argentina/Buenos_Aires').endOf('day').utc().toDate();
  query.andWhere('venta.fecha <= :fechaHasta', { fechaHasta: fechaHastaUtc });
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

  // ✅ Filtro por tipo de ingreso
  if (tipo) {
    query.andWhere('ingreso.tipo = :tipo', { tipo });
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

async getVentaCompleta(id: number): Promise<Venta> {
  const venta = await this.repo.findOne({
    where: { id },
    relations: [
      'usuario',
      'almacen',
      'items',
      'items.producto',
      'items.producto.unidad',
      'items.producto.categoria',
      'ingresos',
    ],
  });

  if (!venta) {
    throw new NotFoundException(`Venta con ID ${id} no encontrada`);
  }

  return venta;
}


async obtenerEstadisticasVentas(filtros: EstadisticasVentasDto) {
    const { fechaDesde, fechaHasta } = filtros;
    const condiciones = [];
    const fechaDesdeUtc = fechaDesde
  ? moment.tz(fechaDesde, 'America/Argentina/Buenos_Aires').startOf('day').utc().format('YYYY-MM-DD HH:mm:ss')
  : null;
const fechaHastaUtc = fechaHasta
  ? moment.tz(fechaHasta, 'America/Argentina/Buenos_Aires').endOf('day').utc().format('YYYY-MM-DD HH:mm:ss')
  : null;

if (fechaDesdeUtc) condiciones.push(`v.fecha >= '${fechaDesdeUtc}'`);
if (fechaHastaUtc) condiciones.push(`v.fecha <= '${fechaHastaUtc}'`);
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
        SUM(COALESCE(vi.cantidad, 0))::INTEGER      AS "cantidadVendidaPiezas",
        SUM(COALESCE(vi.cantidad_gramos, 0))::FLOAT AS "gramosVendidos",
        SUM(vi.subtotal)::FLOAT                     AS ingresos
      FROM venta_item vi
      JOIN producto p ON p.id = vi.producto_id
      JOIN venta v ON v.id = vi.venta_id
      ${whereClause}
      GROUP BY p.id;
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

// estadisticas.service.ts
async obtenerTotalPorCategoria(fechaDesde?: string, fechaHasta?: string) {
  const query = this.dataSource.createQueryRunner();
  await query.connect();

  const resultados = await query.query(
    `
    SELECT
      c.id AS "categoriaId",
      c.nombre AS "categoriaNombre",
      SUM(vi.subtotal) AS "totalGenerado"
    FROM venta_item vi
    JOIN producto p ON p.id = vi.producto_id
    JOIN categoria c ON c.id = p.categoria_id
    JOIN venta v ON v.id = vi.venta_id
    WHERE ($1::timestamp IS NULL OR v.fecha >= $1)
      AND ($2::timestamp IS NULL OR v.fecha <= $2)
    GROUP BY c.id, c.nombre
    ORDER BY "totalGenerado" DESC;
    `,
    [fechaDesde || null, fechaHasta || null],
  );

  await query.release();
  return resultados;
}

async crearVentaMixta(dto: CreateVentaMixtaDto & { usuario: Usuario }) {
  const items: VentaItem[] = [];
  let total = 0;

  // helpers locales
  const isGranel = (prod: any) =>
    prod?.es_por_gramos === true || prod?.unidad?.codigo === 'g';
  const to2 = (n: number) => Number(n.toFixed(2));
  const to3 = (n: number) => Number(n.toFixed(3));

  // 1) Ítems sueltos (no promo)
  for (const it of dto.items) {
    const producto = await this.productoService.findOne(it.productoId);
    if (!producto) throw new NotFoundException(`Producto ${it.productoId} no encontrado`);

    const granel = isGranel(producto);

    // Validación XOR según tipo
    if (granel && it.cantidad_gramos === undefined) {
      throw new Error(`Producto ${producto.id} se vende por gramos: enviar "cantidad_gramos"`);
    }
    if (!granel && it.cantidad === undefined) {
      throw new Error(`Producto ${producto.id} se vende por piezas: enviar "cantidad"`);
    }

    // Calcular subtotal
    const unidadesFacturadas = granel
      ? (Number(it.cantidad_gramos) / 1000) // kg
      : Number(it.cantidad);               // unidades
    const subtotal = to2(unidadesFacturadas * Number(it.precioUnitario));
    total += subtotal;

    // Armar item
    const ventaItem = new VentaItem();
    ventaItem.producto = producto;
    ventaItem.cantidad = granel ? null : Number(it.cantidad);
    ventaItem.cantidad_gramos = granel
      ? to3(Number(it.cantidad_gramos)).toFixed(3)
      : null;
    ventaItem.precioUnitario = Number(it.precioUnitario); // kg o unidad, según corresponda
    ventaItem.subtotal = subtotal;

    items.push(ventaItem);
  }

  // 2) Promociones (ítem de cobro + detalle de productos incluidos sin precio)
  if (dto.promociones) {
    for (const promoItem of dto.promociones) {
      const promo = await this.promoService.getPromocionById(promoItem.promocionId);
      if (!promo) throw new NotFoundException(`Promoción ${promoItem.promocionId} no encontrada`);

      // Renglón de cobro de la promo
      const subtotalPromo = to2(promo.precioPromo * promoItem.cantidad);
      total += subtotalPromo;

      const promoVentaItem = new VentaItem();
      promoVentaItem.producto = null; // ítem "abstracto" de la promo
      promoVentaItem.cantidad = promoItem.cantidad; // cantidad de combos
      promoVentaItem.cantidad_gramos = null;
      promoVentaItem.precioUnitario = promo.precioPromo;
      promoVentaItem.subtotal = subtotalPromo;
      items.push(promoVentaItem);

      // Desglose de productos reales incluidos (sin precio)
      for (const p of promo.productos) {
        const prod = p.producto;
        const granel = isGranel(prod);

        const productoItem = new VentaItem();
        productoItem.producto = prod;
        productoItem.precioUnitario = 0;
        productoItem.subtotal = 0;

        if (granel) {
          // si tu pivot de promo tiene 'gramos', úsalo; si no, cae en 0
          const gramosTot = Number(p.cantidad_gramos ?? 0) * promoItem.cantidad;
          productoItem.cantidad = null;
          productoItem.cantidad_gramos = to3(gramosTot).toFixed(3);
        } else {
          productoItem.cantidad = (p.cantidad ?? 0) * promoItem.cantidad;
          productoItem.cantidad_gramos = null;
        }

        items.push(productoItem);
      }
    }
  }

  // 3) Venta + ingresos (mixta)
  const almacen = await this.dataSource.getRepository(Almacen).findOneBy({ id: dto.almacenId });
  if (!almacen) throw new NotFoundException(`Almacén ${dto.almacenId} no encontrado`);

  const venta = this.repo.create({
    usuario: dto.usuario,
    almacen,
    items,
    total: to2(total),
    estado: 'CONFIRMADA',
    fecha: moment().tz('America/Argentina/Buenos_Aires').toDate(),
  });
  const saved = await this.repo.save(venta);

  await this.ingresoVentaRepo.save([
    { venta: saved, tipo: 'EFECTIVO',    monto: dto.montoEfectivo },
    { venta: saved, tipo: 'BANCARIZADO', monto: dto.montoBancarizado },
  ]);

  // 4) Bajar stock + movimientos (piezas/gramos)
  for (const it of items) {
    if (!it.producto) continue; // el renglón de cobro de la promo no descuenta

    const piezas = it.cantidad ?? 0;
    const gramos = Number(it.cantidad_gramos ?? 0);

    await this.stockService.changeStock(it.producto.id, dto.almacenId, {
      deltaPiezas: piezas ? -piezas : 0,
      deltaGramos: gramos ? -gramos : 0,
    });

    await this.movService.create({
      producto_id: it.producto.id,
      origen_almacen: dto.almacenId,
      destino_almacen: undefined,
      cantidad: piezas || undefined,               // solo si hubo piezas
      cantidad_gramos: (typeof gramos === 'number' && gramos > 0)
      ? Number(gramos.toFixed(3))                                             // number (no string)
      : undefined,
      tipo: 'salida',
      motivo: `Venta #${saved.id}`,
    });
  }

  return saved;
}



private isGranel(prod: any): boolean {
  return prod?.es_por_gramos === true || prod?.unidad?.codigo === 'g';
}
private to2(n: number) { return Number(n.toFixed(2)); }
private to3(n: number) { return Number(n.toFixed(3)); }



}
