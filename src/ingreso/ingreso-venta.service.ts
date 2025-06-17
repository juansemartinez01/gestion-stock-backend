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

  async obtenerTodosConFiltros(filtros: FiltroIngresoVentaDto) {
  const query = this.repo.createQueryBuilder('ingreso')
    .leftJoinAndSelect('ingreso.venta', 'venta')
    .orderBy('ingreso.fecha', 'DESC');

  if (filtros.tipo) {
    query.andWhere('ingreso.tipo = :tipo', { tipo: filtros.tipo });
  }

  if (filtros.ventaId) {
    query.andWhere('venta.id = :ventaId', { ventaId: filtros.ventaId });
  }

  if (filtros.montoMin !== undefined) {
    query.andWhere('ingreso.monto >= :montoMin', { montoMin: filtros.montoMin });
  }

  if (filtros.montoMax !== undefined) {
    query.andWhere('ingreso.monto <= :montoMax', { montoMax: filtros.montoMax });
  }

  if (filtros.fechaDesde) {
    query.andWhere('ingreso.fecha >= :fechaDesde', { fechaDesde: filtros.fechaDesde });
  }

  if (filtros.fechaHasta) {
    query.andWhere('ingreso.fecha <= :fechaHasta', { fechaHasta: filtros.fechaHasta });
  }

  return query.getMany();
}

  async obtenerResumen() {
    const [efectivo, bancarizado] = await Promise.all([
      this.repo
        .createQueryBuilder('ingreso')
        .select('SUM(ingreso.monto)', 'total')
        .where('ingreso.tipo = :tipo', { tipo: 'EFECTIVO' })
        .getRawOne(),

      this.repo
        .createQueryBuilder('ingreso')
        .select('SUM(ingreso.monto)', 'total')
        .where('ingreso.tipo = :tipo', { tipo: 'BANCARIZADO' })
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
