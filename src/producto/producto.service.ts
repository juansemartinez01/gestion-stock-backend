import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Producto } from './producto.entity';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { BuscarProductoDto } from './dto/buscar-producto.dto';

@Injectable()
export class ProductoService {
  constructor(
    @InjectRepository(Producto)
    private readonly repo: Repository<Producto>,
  ) {}

  findAll(): Promise<Producto[]> {
    return this.repo.find({ relations: ['unidad', 'categoria'] });
  }

  /** Genera un SKU compuesto por un prefijo derivado del nombre
   *  y una cadena aleatoria de 6 caracteres. */
  private generateSku(nombre: string): string {
    // 1) Prefijo: primeras 3 letras (o hasta 5) en mayúsculas, sin espacios
    const prefix = nombre
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')  // elimina caracteres no alfanuméricos
      .substring(0, 5);

    // 2) Sufijo: 6 caracteres alfanuméricos aleatorios
    const random = Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();

    return `${prefix}-${random}`;
  }
  // ────────────────────────────────────────────────────────────────────────────

  async create(dto: CreateProductoDto): Promise<Producto> {
    // Si el usuario no envió SKU, lo generamos automáticamente
    if (!dto.sku) {
      dto.sku = this.generateSku(dto.nombre);
    }

    // Verificar duplicados por SKU
    const existing = await this.repo.findOne({ where: { sku: dto.sku } });
    if (existing) {
      throw new ConflictException(`El producto con SKU "${dto.sku}" ya existe.`);
    }

    const prod = this.repo.create(dto);
    return this.repo.save(prod);
  }

  async findOne(id: number): Promise<Producto> {
  const idParsed = Number(id);
  if (!Number.isInteger(idParsed)) {
    throw new BadRequestException(`ID inválido para producto: ${id}`);
  }

  const prod = await this.repo.findOne({
    where: { id: idParsed },
    relations: ['unidad', 'categoria'],
  });

  if (!prod) {
    throw new NotFoundException(`Producto ${idParsed} no encontrado`);
  }

  return prod;
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


async buscarConFiltros(filtros: BuscarProductoDto): Promise<Producto[]> {
  const {
    nombre,
    sku,
    barcode,
    categoriaId,
    unidadId,
    conStock,
    almacenId,
  } = filtros;

  const query = this.repo.createQueryBuilder('producto')
    .leftJoinAndSelect('producto.unidad', 'unidad')
    .leftJoinAndSelect('producto.categoria', 'categoria')
    .leftJoinAndSelect('producto.compras', 'compras')
    .leftJoinAndSelect('producto.stock', 'stock')
    .leftJoinAndSelect('stock.almacen', 'almacen');

  if (nombre) {
    query.andWhere('producto.nombre ILIKE :nombre', { nombre: `%${nombre}%` });
  }

  if (sku) {
    query.andWhere('producto.sku = :sku', { sku });
  }

  if (barcode) {
    query.andWhere('producto.barcode = :barcode', { barcode });
  }

  const categoriaIdParsed = parseInt(categoriaId as any, 10);
  if (!isNaN(categoriaIdParsed)) {
    query.andWhere('producto.categoria_id = :categoriaId', { categoriaId: categoriaIdParsed });
  }

  const unidadIdParsed = parseInt(unidadId as any, 10);
  if (!isNaN(unidadIdParsed)) {
    query.andWhere('producto.unidad_id = :unidadId', { unidadId: unidadIdParsed });
  }

  const almacenIdParsed = parseInt(almacenId as any, 10);
  const conStockBool = conStock === true || (typeof conStock === 'string' && conStock === 'true');

  if (!isNaN(almacenIdParsed)) {
    query.andWhere('stock.almacen_id = :almacenId', { almacenId: almacenIdParsed });

    if (conStockBool) {
      query.andWhere('stock.cantidad > 0');
    }
  } else if (conStockBool) {
    // Si se pidió conStock pero sin almacén específico, buscamos que exista stock positivo en cualquiera
    query.andWhere('stock.cantidad > 0');
  }

  return query.getMany();
}





  
}