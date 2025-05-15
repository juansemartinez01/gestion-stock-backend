import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Proveedor } from './proveedor.entity';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';


@Injectable()
export class ProveedorService {
  constructor(
    @InjectRepository(Proveedor)
    private readonly repo: Repository<Proveedor>,
  ) {}

  findAll(): Promise<Proveedor[]> {
    return this.repo.find();
  }

  async findOne(id: number): Promise<Proveedor> {
    const prov = await this.repo.findOneBy({ id });
    if (!prov) throw new NotFoundException(`Proveedor ${id} no encontrado`);
    return prov;
  }

  create(dto: CreateProveedorDto): Promise<Proveedor> {
    const prov = this.repo.create(dto);
    return this.repo.save(prov);
  }

  async update(id: number, dto: UpdateProveedorDto): Promise<Proveedor> {
    await this.repo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const res = await this.repo.delete(id);
    if (res.affected === 0) throw new NotFoundException(`Proveedor ${id} no encontrado`);
  }
}
