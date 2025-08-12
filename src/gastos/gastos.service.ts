import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, ILike, IsNull, Not, Repository } from 'typeorm';
import { Gasto } from './gasto.entity';
import { CreateGastoDto } from './dto/create-gasto.dto';
import { UpdateGastoDto } from './dto/update-gasto.dto';
import { FiltroGastoDto } from './dto/filtro-gasto.dto';

@Injectable()
export class GastosService {
  constructor(
    @InjectRepository(Gasto)
    private readonly repo: Repository<Gasto>,
  ) {}

  async crear(dto: CreateGastoDto): Promise<Gasto> {
    // Normalizamos el monto a 2 decimales
    const montoFix2 = Number(dto.monto.toFixed(2));
    const entity = this.repo.create({
      fecha: dto.fecha,
      monto: montoFix2.toFixed(2), // guardar como string por numeric
      descripcion: dto.descripcion.trim(),
      notas: dto.notas?.trim() ?? null,
    });
    return await this.repo.save(entity);
  }

  async actualizar(id: number, dto: UpdateGastoDto): Promise<Gasto> {
    const gasto = await this.repo.findOne({ where: { id } });
    if (!gasto) throw new NotFoundException('Gasto no encontrado');

    if (dto.monto !== undefined) {
      if (dto.monto <= 0) throw new BadRequestException('monto debe ser > 0');
      gasto.monto = Number(dto.monto.toFixed(2)).toFixed(2);
    }
    if (dto.fecha !== undefined) gasto.fecha = dto.fecha;
    if (dto.descripcion !== undefined) gasto.descripcion = dto.descripcion.trim();
    if (dto.notas !== undefined) gasto.notas = dto.notas?.trim() ?? null;

    return await this.repo.save(gasto);
  }

  async obtenerPorId(id: number, incluirEliminados = false): Promise<Gasto> {
    const where: FindOptionsWhere<Gasto> = { id };
    const gasto = await this.repo.findOne({
      where,
      withDeleted: incluirEliminados,
    });
    if (!gasto) throw new NotFoundException('Gasto no encontrado');
    return gasto;
  }

  /**
   * Lista con filtros + paginado + suma total filtrada.
   * Devuelve:
   *  - data: Gasto[]
   *  - page, limit, totalItems, totalPages
   *  - totalMontoFiltrado: string (numeric)
   */
  async listar(f: FiltroGastoDto): Promise<{
    data: Gasto[];
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    totalMontoFiltrado: string;
  }> {
    const {
      desde,
      hasta,
      search,
      minMonto,
      maxMonto,
      page = 1,
      limit = 20,
      orderBy = 'fecha',
      order = 'DESC',
      incluirEliminados,
    } = f;

    if (desde && hasta && new Date(desde) > new Date(hasta)) {
      throw new BadRequestException('El rango de fechas es inválido: desde > hasta');
    }
    if (minMonto && maxMonto && minMonto > maxMonto) {
      throw new BadRequestException('El rango de monto es inválido: minMonto > maxMonto');
    }

    // QueryBuilder para data
    const qb = this.repo.createQueryBuilder('g')
      .select(['g.id', 'g.fecha', 'g.monto', 'g.descripcion', 'g.notas', 'g.createdAt', 'g.updatedAt', 'g.deletedAt']);

    // Soft delete: por defecto excluye eliminados; si incluirEliminados === 'true', incluir
    if (incluirEliminados === 'true') {
      qb.withDeleted();
    } else {
      qb.andWhere('g.deletedAt IS NULL');
    }

    // Filtros
    if (desde && hasta) {
      qb.andWhere('g.fecha BETWEEN :desde AND :hasta', { desde, hasta });
    } else if (desde) {
      qb.andWhere('g.fecha >= :desde', { desde });
    } else if (hasta) {
      qb.andWhere('g.fecha <= :hasta', { hasta });
    }

    if (search) {
      qb.andWhere('(g.descripcion ILIKE :q OR g.notas ILIKE :q)', { q: `%${search}%` });
    }

    if (minMonto !== undefined) {
      qb.andWhere('g.monto >= :minMonto', { minMonto });
    }
    if (maxMonto !== undefined) {
      qb.andWhere('g.monto <= :maxMonto', { maxMonto });
    }

    // Orden
    const orderMap: Record<string, string> = {
      fecha: 'g.fecha',
      monto: 'g.monto',
      createdAt: 'g.createdAt',
    };
    qb.orderBy(orderMap[orderBy], order);

    // Paginado
    qb.skip((page - 1) * limit).take(limit);

    const [data, totalItems] = await qb.getManyAndCount();

    // Suma total con los mismos filtros
    const sumQb = this.repo.createQueryBuilder('g').select('COALESCE(SUM(g.monto), 0)', 'total');
    if (incluirEliminados === 'true') {
      sumQb.withDeleted();
    } else {
      sumQb.andWhere('g.deletedAt IS NULL');
    }
    if (desde && hasta) {
      sumQb.andWhere('g.fecha BETWEEN :desde AND :hasta', { desde, hasta });
    } else if (desde) {
      sumQb.andWhere('g.fecha >= :desde', { desde });
    } else if (hasta) {
      sumQb.andWhere('g.fecha <= :hasta', { hasta });
    }
    if (search) {
      sumQb.andWhere('(g.descripcion ILIKE :q OR g.notas ILIKE :q)', { q: `%${search}%` });
    }
    if (minMonto !== undefined) {
      sumQb.andWhere('g.monto >= :minMonto', { minMonto });
    }
    if (maxMonto !== undefined) {
      sumQb.andWhere('g.monto <= :maxMonto', { maxMonto });
    }

    const row = await sumQb.getRawOne<{ total: string } | null>();
    const totalMontoFiltrado = row?.total ?? '0';

    return {
      data,
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
      totalMontoFiltrado: totalMontoFiltrado ?? '0',
    };
  }

  async eliminar(id: number): Promise<void> {
    const gasto = await this.repo.findOne({ where: { id } });
    if (!gasto) throw new NotFoundException('Gasto no encontrado');
    await this.repo.softRemove(gasto);
  }

  // Opción: borrado definitivo (útil para datos de prueba – restringilo si querés)
  async eliminarDefinitivo(id: number): Promise<void> {
    const gasto = await this.repo.findOne({ where: { id }, withDeleted: true });
    if (!gasto) throw new NotFoundException('Gasto no encontrado');
    await this.repo.remove(gasto);
  }
}
