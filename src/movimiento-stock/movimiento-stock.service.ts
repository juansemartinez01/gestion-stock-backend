import { Injectable, NotFoundException } from '@nestjs/common';
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
      'movimiento.tipo',
      'movimiento.fecha',
      'movimiento.usuario_id',
      'movimiento.motivo',
      'movimiento.proveedor_id',
      'movimiento.precio_unitario',
      'movimiento.precio_total',

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
    const mov = this.repo.create(dto);
    return this.repo.save(mov);
  }

  async update(id: number, dto: UpdateMovimientoStockDto): Promise<MovimientoStock> {
    await this.repo.update(id, dto as any);
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