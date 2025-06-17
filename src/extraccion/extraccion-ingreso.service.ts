// extraccion-ingreso.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExtraccionIngreso } from './extraccion-ingreso.entity';
import { CreateExtraccionDto } from './dto/create-extraccion.dto';
import { IngresoVenta } from 'src/ingreso/ingreso-venta.entity';
import { FiltroExtraccionDto } from './dto/filtro-extraccion.dto';

@Injectable()
export class ExtraccionIngresoService {
  constructor(
    @InjectRepository(ExtraccionIngreso)
    private readonly repo: Repository<ExtraccionIngreso>,
    @InjectRepository(IngresoVenta)
    private readonly ingresoRepo: Repository<IngresoVenta>,
  ) {}

  async crear(dto: CreateExtraccionDto) {
    // 1. Obtener total disponible del tipo
    const total = await this.ingresoRepo
      .createQueryBuilder('ing')
      .select('SUM(ing.monto)', 'suma')
      .where('ing.tipo = :tipo', { tipo: dto.origen })
      .getRawOne();

    const totalDisponible = parseFloat(total.suma || 0);

    // 2. Validar disponibilidad
    if (dto.monto > totalDisponible) {
      throw new BadRequestException(
        `Fondos insuficientes en ${dto.origen}. Total disponible: $${totalDisponible.toFixed(2)}`,
      );
    }

    // 3. Guardar extracción
    const extraccion = this.repo.create({
      origen: dto.origen,
      monto: dto.monto,
      motivo: dto.motivo,
    });
    return this.repo.save(extraccion);
  }

  // extraccion-ingreso.service.ts
async obtenerConFiltros(filtro: FiltroExtraccionDto) {
  const query = this.repo.createQueryBuilder('ext')
    .orderBy('ext.fecha', 'DESC');

  if (filtro.origen) {
    query.andWhere('ext.origen = :origen', { origen: filtro.origen });
  }

  if (filtro.fechaDesde) {
    query.andWhere('ext.fecha >= :desde', { desde: filtro.fechaDesde });
  }

  if (filtro.fechaHasta) {
    query.andWhere('ext.fecha <= :hasta', { hasta: filtro.fechaHasta });
  }

  return query.getMany();
}


  async obtenerTotalesDisponibles(): Promise<Record<'EFECTIVO' | 'BANCARIZADO', number>> {
  // Total ingresos por tipo
  const ingresos = await this.ingresoRepo
    .createQueryBuilder('ing')
    .select('ing.tipo', 'tipo')
    .addSelect('SUM(ing.monto)', 'total')
    .groupBy('ing.tipo')
    .getRawMany();

  const ingresosMap: Record<string, number> = {};
  ingresos.forEach(i => {
    ingresosMap[i.tipo] = parseFloat(i.total);
  });

  // Total extracciones por tipo
  const extracciones = await this.repo
    .createQueryBuilder('ext')
    .select('ext.origen', 'tipo')
    .addSelect('SUM(ext.monto)', 'total')
    .groupBy('ext.origen')
    .getRawMany();

  const extraccionesMap: Record<string, number> = {};
  extracciones.forEach(e => {
    extraccionesMap[e.tipo] = parseFloat(e.total);
  });

  // Calcular saldo disponible por tipo
  const tipos: ('EFECTIVO' | 'BANCARIZADO')[] = ['EFECTIVO', 'BANCARIZADO'];
  const resultado: Record<'EFECTIVO' | 'BANCARIZADO', number> = {
    EFECTIVO: 0,
    BANCARIZADO: 0,
  };

  tipos.forEach(tipo => {
    const totalIngreso = ingresosMap[tipo] || 0;
    const totalExtraccion = extraccionesMap[tipo] || 0;
    resultado[tipo] = parseFloat((totalIngreso - totalExtraccion).toFixed(2));
  });

  return resultado;
}
}
