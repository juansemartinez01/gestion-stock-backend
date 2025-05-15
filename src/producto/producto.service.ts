import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Producto } from './producto.entity';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';

@Injectable()
export class ProductoService {
  constructor(
    @InjectRepository(Producto)
    private readonly repo: Repository<Producto>,
  ) {}

  findAll(): Promise<Producto[]> {
    return this.repo.find({ relations: ['unidad', 'categoria', 'proveedor'] });
  }

  async findOne(id: number): Promise<Producto> {
    const prod = await this.repo.findOne({
      where: { id },
      relations: ['unidad', 'categoria', 'proveedor'],
    });
    if (!prod) throw new NotFoundException(`Producto ${id} no encontrado`);
    return prod;
  }

  create(dto: CreateProductoDto): Promise<Producto> {
    const prod = this.repo.create(dto);
    return this.repo.save(prod);
  }

  async update(id: number, dto: UpdateProductoDto): Promise<Producto> {
    await this.repo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const res = await this.repo.delete(id);
    if (res.affected === 0) throw new NotFoundException(`Producto ${id} no encontrado`);
  }

  // src/producto/producto.service.ts
  async findByBarcode(barcode: string): Promise<Producto> {
    const p = await this.repo.findOne({ where: { barcode } });
    if (!p) throw new NotFoundException(`No existe producto con barcode ${barcode}`);
    return p;
  }
}