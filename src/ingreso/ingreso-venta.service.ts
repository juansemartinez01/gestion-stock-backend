import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IngresoVenta } from './ingreso-venta.entity';
import { CreateIngresoVentaDto } from './dto/create-ingreso-venta.dto';
import { Venta } from '../venta/venta.entity';
import { FiltroIngresoVentaDto } from './dto/filtro-ingreso-venta.dto';

@Injectable()
export class IngresoVentaService {
  constructor(
    @InjectRepository(IngresoVenta)
    private readonly repo: Repository<IngresoVenta>,

    @InjectRepository(Venta)
    private readonly ventaRepo: Repository<Venta>,
  ) {}

  async registrarIngreso(dto: CreateIngresoVentaDto) {
    const venta = await this.ventaRepo.findOne({ where: { id: dto.ventaId } });
    if (!venta) {
      throw new NotFoundException(`Venta con id ${dto.ventaId} no encontrada`);
    }

    const ingreso = this.repo.create({
      venta,
      tipo: dto.tipo,
      monto: dto.monto,
    });

    return await this.repo.save(ingreso);
  }

    async obtenerTodosConFiltros(filtros: FiltroIngresoVentaDto & {
  page?: number;
  limit?: number;
  ordenCampo?: string;
  ordenDireccion?: 'ASC' | 'DESC';
  almacenId?: number;
}): Promise<{
  data: any[];
  total: number;
  page: number;
  limit: number;
}> {
  const {
    tipo,
    ventaId,
    montoMin,
    montoMax,
    fechaDesde,
    fechaHasta,
    almacenId, // ✅ nuevo
    page = 1,
    limit = 50,
    ordenCampo = 'fecha',
    ordenDireccion = 'DESC',
  } = filtros;

  const query = this.repo.createQueryBuilder('ingreso')
    .leftJoinAndSelect('ingreso.venta', 'venta')
    .leftJoin('venta.almacen', 'almacen') // ✅ nuevo JOIN
    .skip((page - 1) * limit)
    .take(limit);

  if (tipo) query.andWhere('ingreso.tipo = :tipo', { tipo });
  if (ventaId) query.andWhere('venta.id = :ventaId', { ventaId });
  if (montoMin !== undefined) query.andWhere('ingreso.monto >= :montoMin', { montoMin });
  if (montoMax !== undefined) query.andWhere('ingreso.monto <= :montoMax', { montoMax });
  if (fechaDesde) query.andWhere('ingreso.fecha >= :fechaDesde', { fechaDesde: new Date(fechaDesde) });
  if (fechaHasta) query.andWhere('ingreso.fecha <= :fechaHasta', { fechaHasta: new Date(fechaHasta) });

  if (almacenId) query.andWhere('almacen.id = :almacenId', { almacenId }); // ✅ filtro

  const camposValidos = ['fecha', 'id', 'monto', 'tipo'];
  const campoOrdenFinal = camposValidos.includes(ordenCampo) ? ordenCampo : 'fecha';

  query.orderBy(`ingreso.${campoOrdenFinal}`, ordenDireccion);

  const [data, total] = await query.getManyAndCount();

  return {
    data,
    total,
    page,
    limit,
  };
}



  async obtenerResumen(filtros: { fechaDesde?: string; fechaHasta?: string }) {
  const { fechaDesde, fechaHasta } = filtros;

  const condiciones: string[] = [];
  const parametros: Record<string, any> = {};

  if (fechaDesde) {
    condiciones.push('ingreso.fecha >= :fechaDesde');
    parametros.fechaDesde = new Date(fechaDesde);
  }

  if (fechaHasta) {
    condiciones.push('ingreso.fecha <= :fechaHasta');
    parametros.fechaHasta = new Date(fechaHasta);
  }

  const whereBase = condiciones.length > 0 ? `AND ${condiciones.join(' AND ')}` : '';

  const [efectivo, bancarizado] = await Promise.all([
    this.repo
      .createQueryBuilder('ingreso')
      .select('SUM(ingreso.monto)', 'total')
      .where(`ingreso.tipo = :tipo ${whereBase}`, { tipo: 'EFECTIVO', ...parametros })
      .getRawOne(),

    this.repo
      .createQueryBuilder('ingreso')
      .select('SUM(ingreso.monto)', 'total')
      .where(`ingreso.tipo = :tipo ${whereBase}`, { tipo: 'BANCARIZADO', ...parametros })
      .getRawOne(),
  ]);

  const totalEfectivo = parseFloat(efectivo?.total || '0');
  const totalBancarizado = parseFloat(bancarizado?.total || '0');

  return {
    efectivo: totalEfectivo,
    bancarizado: totalBancarizado,
    total: totalEfectivo + totalBancarizado,
  };
}

}
