import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Promocion } from './promocion.entity';
import { CreatePromocionDto } from './dto/create-promocion.dto';
import { PromocionProducto } from './promocion-producto.entity';
import { UpdatePromocionDto } from './dto/update-promocion.dto';

@Injectable()
export class PromocionService {
  constructor(
    @InjectRepository(Promocion)
    private readonly promoRepo: Repository<Promocion>,

    @InjectRepository(PromocionProducto)
    private readonly promoProdRepo: Repository<PromocionProducto>,
  ) {}

  async create(dto: CreatePromocionDto): Promise<Promocion> {
    const promocion = this.promoRepo.create({
      codigo: dto.codigo,
      precioPromo: dto.precioPromo,
      productos: dto.productos.map(p => {
        const pp = new PromocionProducto();
        pp.producto = { id: p.productoId } as any;
        pp.cantidad = p.cantidad;
        return pp;
      }),
    });

    return this.promoRepo.save(promocion);
  }

  findAll(): Promise<Promocion[]> {
    return this.promoRepo.find({ relations: ['productos'] });
  }

  async findOne(id: number): Promise<Promocion> {
    const promocion = await this.promoRepo.findOne({ where: { id }, relations: ['productos'] });
    if (!promocion) {
      throw new Error(`Promocion with id ${id} not found`);
    }
    return promocion;
  }

  async remove(id: number): Promise<void> {
    await this.promoRepo.delete(id);
  }

async findByCodigo(codigo: string): Promise<Promocion> {
  const promocion = await this.promoRepo.findOne({
    where: { codigo },
    relations: ['productos', 'productos.producto'],
  });

  if (!promocion) {
    throw new NotFoundException(`No se encontró ninguna promoción con el código "${codigo}"`);
  }

  return promocion;
}

async getPromocionById(id: number): Promise<Promocion> {
  const promocion = await this.promoRepo.findOne({
    where: { id },
    relations: ['productos', 'productos.producto'],
  });

  if (!promocion) {
    throw new NotFoundException(`No se encontró ninguna promoción con el id "${id}"`);
  }

  return promocion;
}

async update(id: number, dto: UpdatePromocionDto): Promise<Promocion>
 {
  const promocion = await this.promoRepo.findOne({
    where: { id },
    relations: ['productos'],
  });

  if (!promocion) {
    throw new NotFoundException(`Promoción con id ${id} no encontrada`);
  }

  // Actualizar datos principales
  promocion.codigo = dto.codigo ?? promocion.codigo;
  if (dto.precioPromo !== undefined) {
    promocion.precioPromo = dto.precioPromo;
  }

  // Eliminar productos anteriores
  await this.promoProdRepo.delete({ promocion: { id } });

  // Cargar nuevos productos
  promocion.productos = (dto.productos ?? []).map(p => {
    const pp = new PromocionProducto();
    pp.producto = { id: p.productoId } as any;
    pp.cantidad = p.cantidad;
    return pp;
  });

  return this.promoRepo.save(promocion);
}


}
