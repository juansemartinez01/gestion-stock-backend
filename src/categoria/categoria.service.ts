import { Injectable, NotFoundException } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Categoria } from './categoria.entity';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';

@Injectable()
export class CategoriaService {
  constructor(
    @InjectRepository(Categoria)
    private readonly repo: Repository<Categoria>,
  ) {}

  findAll(): Promise<Categoria[]> {
    return this.repo.find();
  }

  async findOne(id: number): Promise<Categoria> {
    const cat = await this.repo.findOneBy({ id });
    if (!cat) throw new NotFoundException(`Categoría ${id} no encontrada`);
    return cat;
  }

  create(dto: CreateCategoriaDto): Promise<Categoria> {
    const cat = this.repo.create(dto);
    return this.repo.save(cat);
  }

  async update(id: number, dto: UpdateCategoriaDto): Promise<Categoria> {
    await this.repo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const res = await this.repo.delete(id);
    if (res.affected === 0) throw new NotFoundException(`Categoría ${id} no encontrada`);
  }
}
