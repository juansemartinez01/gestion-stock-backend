import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Promocion } from './promocion.entity';
import { CreatePromocionDto } from './dto/create-promocion.dto';
import { PromocionProducto } from './promocion-producto.entity';
import { UpdatePromocionDto } from './dto/update-promocion.dto';
import { Producto } from 'src/producto/producto.entity';

@Injectable()
export class PromocionService {
  constructor(
    @InjectRepository(Promocion)
    private readonly promoRepo: Repository<Promocion>,

    @InjectRepository(PromocionProducto)
    private readonly promoProdRepo: Repository<PromocionProducto>,

    @InjectRepository(Producto) private readonly prodRepo: Repository<Producto>,
  ) {}

  async create(dto: CreatePromocionDto): Promise<Promocion> {
  const existente = await this.promoRepo.findOne({
    where: { codigo: dto.codigo },
    relations: ['productos', 'productos.producto'],
  });
  if (existente) {
    if (existente.activo) {
      const productos = existente.productos.map(p => ({
        id: p.producto.id,
        nombre: p.producto.nombre,
        cantidad: p.cantidad,
        cantidad_gramos: p.cantidad_gramos,
      }));
      throw new ConflictException({
        mensaje: `Ya existe una promoción ACTIVA con el código "${dto.codigo}"`,
        productos,
      });
    } else {
      throw new ConflictException(`El código "${dto.codigo}" pertenece a una promoción INACTIVA. Por favor use otro código.`);
    }
  }

  const productosProcesados: PromocionProducto[] = [];
  for (const p of dto.productos) {
    const prod = await this.prodRepo.findOne({ where: { id: p.productoId } });
    if (!prod) throw new NotFoundException(`Producto ${p.productoId} no encontrado`);

    const esPorGramos = !!prod.es_por_gramos;
    const traePiezas = p.cantidad != null;
    const traeGramos = p.cantidad_gramos != null;

    if (esPorGramos) {
      if (!traeGramos || traePiezas) {
        throw new BadRequestException(`El producto ${prod.nombre} se maneja por gramos: usar 'cantidad_gramos' (y no 'cantidad').`);
      }
    } else {
      if (!traePiezas || traeGramos) {
        throw new BadRequestException(`El producto ${prod.nombre} se maneja por piezas: usar 'cantidad' (y no 'cantidad_gramos').`);
      }
    }

    const pp = new PromocionProducto();
    pp.producto = prod;
    pp.cantidad = esPorGramos ? null : p.cantidad!;
    pp.cantidad_gramos = esPorGramos ? p.cantidad_gramos!.toFixed(3) : null;

    productosProcesados.push(pp);
  }

  const promocion = this.promoRepo.create({
    codigo: dto.codigo,
    precioPromo: dto.precioPromo,
    productos: productosProcesados,
  });

  return this.promoRepo.save(promocion);
}


  findAll(): Promise<Promocion[]> {
    return this.promoRepo.find({ relations: ['productos', 'productos.producto'] });
  }

  async findOne(id: number): Promise<Promocion> {
    const promocion = await this.promoRepo.findOne({ where: { id }, relations: ['productos', 'productos.producto'] });
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

async update(id: number, dto: UpdatePromocionDto): Promise<Promocion> {
  const promocion = await this.promoRepo.findOne({ where: { id }, relations: ['productos'] });
  if (!promocion) throw new NotFoundException(`Promoción con id ${id} no encontrada`);

  if (dto.codigo !== undefined) promocion.codigo = dto.codigo;
  if (dto.precioPromo !== undefined) promocion.precioPromo = dto.precioPromo;

  // reemplazar productos si vienen
  if (dto.productos) {
    await this.promoProdRepo.delete({ promocion: { id } });

    const nuevos: PromocionProducto[] = [];
    for (const p of dto.productos) {
      const prod = await this.prodRepo.findOne({ where: { id: p.productoId } });
      if (!prod) throw new NotFoundException(`Producto ${p.productoId} no encontrado`);

      const esPorGramos = !!prod.es_por_gramos;
      const traePiezas = p.cantidad != null;
      const traeGramos = p.cantidad_gramos != null;

      if (esPorGramos) {
        if (!traeGramos || traePiezas) {
          throw new BadRequestException(`El producto ${prod.nombre} se maneja por gramos: usar 'cantidad_gramos' (y no 'cantidad').`);
        }
      } else {
        if (!traePiezas || traeGramos) {
          throw new BadRequestException(`El producto ${prod.nombre} se maneja por piezas: usar 'cantidad' (y no 'cantidad_gramos').`);
        }
      }

      const pp = new PromocionProducto();
      pp.producto = prod;
      pp.cantidad = esPorGramos ? null : p.cantidad!;
      pp.cantidad_gramos = esPorGramos ? p.cantidad_gramos!.toFixed(3) : null;
      nuevos.push(pp);
    }
    promocion.productos = nuevos;
  }

  return this.promoRepo.save(promocion);
}


async findActivas(): Promise<Promocion[]> {
  return this.promoRepo.find({
    where: { activo: true },
    relations: ['productos', 'productos.producto'],
  });
}

async borrarLogicamente(id: number): Promise<{ message: string }> {
  const promocion = await this.promoRepo.findOne({ where: { id } });
  if (!promocion) {
    throw new NotFoundException(`No se encontró ninguna promoción con id ${id}`);
  }

  promocion.activo = false;
  await this.promoRepo.save(promocion);
  return { message: `Promoción con id ${id} desactivada correctamente` };
}


}
