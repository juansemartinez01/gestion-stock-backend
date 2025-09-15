// src/orden-compra/orden-compra.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, DeepPartial } from 'typeorm';
import { OrdenCompra } from './orden-compra.entity';
import { OrdenCompraItem } from './orden-compra-item.entity';
import { CreateOrdenCompraDto } from './dto/create-orden-compra.dto';
import { ProveedorService } from '../proveedor/proveedor.service';
import { ProductoService } from '../producto/producto.service';
import { MovimientoStock } from 'src/movimiento-stock/movimiento-stock.entity';
import { StockActual } from 'src/stock-actual/stock-actual.entity';
import { FiltroOrdenCompraDto } from './dto/filtro-orden-compra.dto';
import { Producto } from 'src/producto/producto.entity';



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

      // Calculamos subtotales con validación por item
      const itemsProcesados: Array<{
        producto: Producto;
        productoId: number;
        esPorGramos: boolean;
        cantidad?: number;
        cantidad_gramos?: number;
        precioUnitario: number;
        subtotal: number;
      }> = [];

      for (const i of items) {
        const producto = await manager.findOne(Producto, { where: { id: i.productoId } });
        if (!producto) {
          throw new NotFoundException(`Producto ${i.productoId} no encontrado`);
        }

        const esPorGramos = !!producto.es_por_gramos;

        // Validaciones "uno u otro"
        const traePiezas = i.cantidad != null && i.cantidad !== undefined;
        const traeGramos = i.cantidad_gramos != null && i.cantidad_gramos !== undefined;

        if (esPorGramos) {
          if (!traeGramos || traePiezas) {
            throw new BadRequestException(
              `El producto ${producto.nombre} se maneja por gramos: enviar 'cantidad_gramos' (y NO 'cantidad').`,
            );
          }
        } else {
          if (!traePiezas || traeGramos) {
            throw new BadRequestException(
              `El producto ${producto.nombre} se maneja por piezas: enviar 'cantidad' (y NO 'cantidad_gramos').`,
            );
          }
        }

        // Semántica precioUnitario:
        // - Por piezas: precio por pieza
        // - Por gramos: precio por gramo
        // Si preferís manejar "precio por KG", descomentar:
        // const precioUnitario = esPorGramos ? (i.precioUnitario / 1000) : i.precioUnitario;
        const precioUnitario = i.precioUnitario;

        const cantidad = traePiezas ? i.cantidad! : undefined;
        const cantidad_gramos = traeGramos ? i.cantidad_gramos! : undefined;

        const base = esPorGramos ? cantidad_gramos! : cantidad!;
        const subtotal = Number((base * precioUnitario).toFixed(2));

        itemsProcesados.push({
          producto,
          productoId: i.productoId,
          esPorGramos,
          cantidad,
          cantidad_gramos,
          precioUnitario,
          subtotal,
        });
      }

      // Total de la orden con subtotales ya validados
      const totalOrden = itemsProcesados.reduce((acc, it) => acc + it.subtotal, 0);

      // 1) Crear orden
      const orden = manager.create(OrdenCompra, {
        proveedor: { id: proveedorId },
        fecha: new Date(),
        total: totalOrden,
      });
      await manager.save(orden);

      // 2) Crear items + 3) movimiento stock + 4) actualizar stock
      for (const it of itemsProcesados) {
        // 2) item
        const ordenItem = manager.create(OrdenCompraItem, {
          orden: orden,
          producto: { id: it.productoId },
          cantidad: it.esPorGramos ? null : it.cantidad!,
          cantidad_gramos: it.esPorGramos ? (Number(it.cantidad_gramos!.toFixed(3)).toString()) : null, // guardamos como string para NUMERIC
          precioUnitario: it.precioUnitario,
          subtotal: it.subtotal,
        });
        await manager.save(ordenItem);

        // 3) movimiento
        

        const movimiento = new MovimientoStock();
        movimiento.producto_id     = it.productoId;
        movimiento.destino_almacen = almacenId;
        movimiento.cantidad        = it.esPorGramos ? null : it.cantidad!;
        movimiento.cantidad_gramos = it.esPorGramos ? it.cantidad_gramos!.toFixed(3) : null;
        movimiento.tipo            = 'entrada';
        movimiento.usuario_id      = usuarioId;
        movimiento.proveedor_id    = proveedorId;
        movimiento.precioUnitario  = it.precioUnitario;
        movimiento.precioTotal     = it.subtotal;
        movimiento.motivo          = 'Ingreso por orden de compra';

        await manager.save(movimiento);




        // 4) stock_actual
        let stock = await manager.findOne(StockActual, {
          where: {
            producto: { id: it.productoId },
            almacen: { id: almacenId },
          },
        });

        if (stock) {
          if (it.esPorGramos) {
            const actual = stock.cantidad_gramos ? Number(stock.cantidad_gramos) : 0;
            const nuevo = actual + it.cantidad_gramos!;
            stock.cantidad_gramos = nuevo.toFixed(3);
            // aseguramos piezas en 0 si es por gramos
            if (stock.cantidad == null) stock.cantidad = 0;
          } else {
            stock.cantidad = (stock.cantidad ?? 0) + it.cantidad!;
            // aseguramos gramos nulo/0 si es por piezas (opcional)
            if (!stock.cantidad_gramos) stock.cantidad_gramos = null;
          }
          // UpdateDateColumn maneja last_updated solo
          await manager.save(stock);
        } else {
          // crear registro nuevo
          const nuevoStock = manager.create(StockActual, {
            producto: { id: it.productoId },
            almacen: { id: almacenId },
            cantidad: it.esPorGramos ? 0 : it.cantidad!,
            cantidad_gramos: it.esPorGramos ? it.cantidad_gramos!.toFixed(3) : null,
            // last_updated lo setea automáticamente el @UpdateDateColumn al update posterior;
            // en insert no aplica, pero no es necesario setearlo manualmente
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
      'items.cantidad_gramos',
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
      cantidad_gramos: item['cantidad_gramos'] ?? null,
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
