// extraccion-ingreso.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExtraccionIngreso } from './extraccion-ingreso.entity';
import { CreateExtraccionDto } from './dto/create-extraccion.dto';
import { IngresoVenta } from 'src/ingreso/ingreso-venta.entity';
import { FiltroExtraccionDto } from './dto/filtro-extraccion.dto';
import { UpdateExtraccionDto } from './dto/update-extraccion.dto';

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

  
  async obtenerConFiltros(filtro: FiltroExtraccionDto & {
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
      origen,
      fechaDesde,
      fechaHasta,
      page = 1,
      limit = 50,
      ordenCampo = 'fecha',
      ordenDireccion = 'DESC',
    } = filtro;

    const query = this.repo.createQueryBuilder('ext')
      .skip((page - 1) * limit)
      .take(limit);

    if (origen) {
      query.andWhere('ext.origen = :origen', { origen });
    }

    if (fechaDesde) {
      query.andWhere('ext.fecha >= :fechaDesde', { fechaDesde: new Date(fechaDesde) });
    }

    if (fechaHasta) {
      query.andWhere('ext.fecha <= :fechaHasta', { fechaHasta: new Date(fechaHasta) });
    }

    const camposValidos = ['fecha', 'id', 'origen'];
    const campoOrdenFinal = camposValidos.includes(ordenCampo) ? ordenCampo : 'fecha';

    query.orderBy(`ext.${campoOrdenFinal}`, ordenDireccion);

    const [data, total] = await query.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
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

async borrarExtraccion(id: number) {
  const ext = await this.repo.findOne({ where: { id } });
  if (!ext) {
    throw new NotFoundException(`Extracción ${id} no encontrada`);
  }
  return this.repo.remove(ext);
}

async editarExtraccion(id: number, dto: UpdateExtraccionDto) {
  const ext = await this.repo.findOne({ where: { id } });
  if (!ext) {
    throw new NotFoundException(`Extracción ${id} no encontrada`);
  }

  // Calcular saldo disponible si cambia monto o tipo
  if (dto.origen || dto.monto) {
    const nuevoOrigen = dto.origen || ext.origen;
    const nuevoMonto = dto.monto ?? ext.monto;

    const ingresos = await this.ingresoRepo
      .createQueryBuilder('ing')
      .select('SUM(ing.monto)', 'suma')
      .where('ing.tipo = :tipo', { tipo: nuevoOrigen })
      .getRawOne();

    const totalIngresos = parseFloat(ingresos.suma || 0);

    const otrasExtracciones = await this.repo
      .createQueryBuilder('ext')
      .select('SUM(ext.monto)', 'suma')
      .where('ext.origen = :tipo', { tipo: nuevoOrigen })
      .andWhere('ext.id != :id', { id }) // ignorar la que estoy editando
      .getRawOne();

    const totalOtras = parseFloat(otrasExtracciones.suma || 0);
    const disponible = totalIngresos - totalOtras;

    if (nuevoMonto > disponible) {
      throw new BadRequestException(
        `Fondos insuficientes en ${nuevoOrigen}. Disponible: $${disponible.toFixed(2)}`
      );
    }
  }

  Object.assign(ext, dto);
  return this.repo.save(ext);
}
}
