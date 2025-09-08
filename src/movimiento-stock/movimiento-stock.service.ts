import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MovimientoStock } from './movimiento-stock.entity';
import { CreateMovimientoStockDto } from './dto/create-movimiento-stock.dto';
import { UpdateMovimientoStockDto } from './dto/update-movimiento-stock.dto';

@Injectable()
export class MovimientoStockService {
  constructor(
    @InjectRepository(MovimientoStock)
    private readonly repo: Repository<MovimientoStock>,
  ) {}

  async findAllConFiltros(filtros: {
  fechaDesde?: string;
  fechaHasta?: string;
  usuarioId?: string;
  tipo?: string;
  proveedorId?: string;
  page?: number;
  limit?: number;
  ordenCampo?: string;
  ordenDireccion?: 'ASC' | 'DESC';
}): Promise<{
  data: any[];
  total: number;
  page: number;
  limit: number;
}> {
  const {
    fechaDesde,
    fechaHasta,
    usuarioId,
    tipo,
    proveedorId,
    page = 1,
    limit = 50,
    ordenCampo = 'fecha',
    ordenDireccion = 'DESC',
  } = filtros;

  const query = this.repo.createQueryBuilder('movimiento')
    .leftJoin('movimiento.producto', 'producto')
    .leftJoin('producto.unidad', 'unidad')
    .leftJoin('producto.categoria', 'categoria')
    .leftJoin('movimiento.almacenOrigen', 'almacenOrigen')
    .leftJoin('movimiento.almacenDestino', 'almacenDestino')
    .select([
    'movimiento.id',
    'movimiento.producto_id',
    'movimiento.origen_almacen',
    'movimiento.destino_almacen',
    'movimiento.cantidad',
    'movimiento.cantidad_gramos',  // 👈 incluir gramos
    'movimiento.tipo',
    'movimiento.fecha',
    'movimiento.usuario_id',
    'movimiento.motivo',
    'movimiento.proveedor_id',
    'movimiento.precioUnitario',   // 👈 usar nombre de propiedad
    'movimiento.precioTotal',      // 👈 idem
    'producto.id',
    'producto.nombre',
    'producto.precioBase',
    'unidad.nombre',
    'categoria.nombre',
    'almacenOrigen.id',
    'almacenOrigen.nombre',
    'almacenOrigen.capacidad',
    'almacenDestino.id',
    'almacenDestino.nombre',
    'almacenDestino.capacidad',
  ])

    .skip((page - 1) * limit)
    .take(limit);

  if (fechaDesde) {
    query.andWhere('movimiento.fecha >= :fechaDesde', { fechaDesde: new Date(fechaDesde) });
  }

  if (fechaHasta) {
    query.andWhere('movimiento.fecha <= :fechaHasta', { fechaHasta: new Date(fechaHasta) });
  }

  if (usuarioId) {
    query.andWhere('movimiento.usuario_id = :usuarioId', { usuarioId });
  }

  if (tipo) {
    query.andWhere('movimiento.tipo = :tipo', { tipo });
  }

  if (proveedorId) {
    query.andWhere('movimiento.proveedor_id = :proveedorId', { proveedorId });
  }

  const camposValidos = ['fecha', 'id', 'tipo'];
  const campoOrdenFinal = camposValidos.includes(ordenCampo) ? ordenCampo : 'fecha';

  query.orderBy(`movimiento.${campoOrdenFinal}`, ordenDireccion);

  const [data, total] = await query.getManyAndCount();

  return {
    data,
    total,
    page,
    limit,
  };
}


  async findOne(id: number): Promise<MovimientoStock> {
    const mov = await this.repo.findOne({
      where: { id },
      relations: ['producto', 'almacenOrigen', 'almacenDestino'],
    });
    if (!mov) throw new NotFoundException(`Movimiento ${id} no encontrado`);
    return mov;
  }

  create(dto: CreateMovimientoStockDto): Promise<MovimientoStock> {
  // Validaciones mínimas por tipo (por si algún request se saltea el DTO)
  if (dto.tipo === 'entrada') {
    if (!dto.destino_almacen) {
      throw new BadRequestException('Para una ENTRADA debe indicarse destino_almacen.');
    }
    dto.origen_almacen = undefined;
  }
  if (dto.tipo === 'salida' || dto.tipo === 'insumo') {
    if (!dto.origen_almacen) {
      throw new BadRequestException(`Para una ${dto.tipo.toUpperCase()} debe indicarse origen_almacen.`);
    }
    dto.destino_almacen = undefined;
  }
  if (dto.tipo === 'traspaso') {
    if (!dto.origen_almacen || !dto.destino_almacen) {
      throw new BadRequestException('Para un TRASPASO se requieren origen_almacen y destino_almacen.');
    }
    if (dto.origen_almacen === dto.destino_almacen) {
      throw new BadRequestException('En un TRASPASO, origen_almacen y destino_almacen deben ser distintos.');
    }
  }

  // Normalizar gramos a string con 3 decimales (NUMERIC)
  const cantidadGramosStr =
    dto.cantidad_gramos !== undefined && dto.cantidad_gramos !== null
      ? Number(dto.cantidad_gramos).toFixed(3)
      : undefined;

  // (Opcional) autocalcular precioTotal si no viene
  const precioTotalCalc =
    dto.precioTotal ?? (
      dto.precioUnitario != null
        ? Number(
            ((dto.cantidad ?? 0) + (dto.cantidad_gramos ? dto.cantidad_gramos : 0)) // si querés, cambialo para usar SOLO la base que aplique
            .toFixed(3)
          ) * Number(dto.precioUnitario.toFixed(2))
        : undefined
    );

  const mov = this.repo.create({
    ...dto,
    cantidad_gramos: cantidadGramosStr,     // 👈 string (NUMERIC)
    precioTotal: precioTotalCalc,           // 👈 opcional
  } as Partial<MovimientoStock>);

  return this.repo.save(mov as MovimientoStock);
}

  async update(id: number, dto: UpdateMovimientoStockDto): Promise<MovimientoStock> {
  const patch: any = { ...dto };

  if (dto.cantidad_gramos !== undefined && dto.cantidad_gramos !== null) {
    patch.cantidad_gramos = Number(dto.cantidad_gramos).toFixed(3); // 👈 string
  }

  await this.repo.update(id, patch);
  return this.findOne(id);
}


  async remove(id: number): Promise<void> {
    const res = await this.repo.delete(id);
    if (res.affected === 0) throw new NotFoundException(`Movimiento ${id} no encontrado`);
  }


  async findAllInsumos() {
  return this.repo.find({
    where: { tipo: 'insumo' },
    relations: ['producto', 'almacenOrigen'], // opcional: incluir relaciones útiles
    order: { fecha: 'DESC' } // si tenés un campo de fecha
  });
}
}