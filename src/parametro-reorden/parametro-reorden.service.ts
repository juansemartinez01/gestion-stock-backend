// src/parametro-reorden/parametro-reorden.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ParametroReorden } from './parametro-reorden.entity';
import { CreateParametroReordenDto } from './dto/create-parametro-reorden.dto';
import { UpdateParametroReordenDto } from './dto/update-parametro-reorden.dto';

function fix3(n: number) {
  return Number(n.toFixed(3));
}

@Injectable()
export class ParametroReordenService {
  constructor(
    @InjectRepository(ParametroReorden)
    private readonly repo: Repository<ParametroReorden>,
  ) {}

  findAll(): Promise<ParametroReorden[]> {
    return this.repo.find();
  }

  async findOne(id: number): Promise<ParametroReorden> {
    const param = await this.repo.findOneBy({ id });
    if (!param) throw new NotFoundException(`ParametroReorden ${id} no encontrado`);
    return param;
  }

  async create(dto: CreateParametroReordenDto): Promise<ParametroReorden> {
    // reglas comunes
    if (dto.nivel_optimo < dto.nivel_minimo) {
      throw new BadRequestException('nivel_optimo debe ser mayor o igual a nivel_minimo');
    }

    const entity = this.repo.create({
      ...dto,
      nivel_minimo: fix3(dto.nivel_minimo),
      nivel_optimo: fix3(dto.nivel_optimo),
    });

    return this.repo.save(entity);
  }

  async update(id: number, dto: UpdateParametroReordenDto): Promise<ParametroReorden> {
    const current = await this.findOne(id);

    const next = {
      ...current,
      ...dto,
    } as ParametroReorden;

    if (dto.nivel_minimo !== undefined) next.nivel_minimo = fix3(dto.nivel_minimo);
    if (dto.nivel_optimo !== undefined) next.nivel_optimo = fix3(dto.nivel_optimo);

    // Validación coherencia final
    const min = next.nivel_minimo;
    const opt = next.nivel_optimo;
    if (opt < min) {
      throw new BadRequestException('nivel_optimo debe ser mayor o igual a nivel_minimo');
    }

    await this.repo.update(id, {
      producto_id: next.producto_id,
      nivel_minimo: next.nivel_minimo,
      nivel_optimo: next.nivel_optimo,
    } as any);

    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const res = await this.repo.delete(id);
    if (res.affected === 0) throw new NotFoundException(`ParametroReorden ${id} no encontrado`);
  }
}
