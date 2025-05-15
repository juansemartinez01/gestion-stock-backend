import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ParametroReorden } from './parametro-reorden.entity';
import { CreateParametroReordenDto } from './dto/create-parametro-reorden.dto';
import { UpdateParametroReordenDto } from './dto/update-parametro-reorden.dto';

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

  create(dto: CreateParametroReordenDto): Promise<ParametroReorden> {
    const param = this.repo.create(dto);
    return this.repo.save(param);
  }

  async update(id: number, dto: UpdateParametroReordenDto): Promise<ParametroReorden> {
    await this.repo.update(id, dto as any);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const res = await this.repo.delete(id);
    if (res.affected === 0) throw new NotFoundException(`ParametroReorden ${id} no encontrado`);
  }
}