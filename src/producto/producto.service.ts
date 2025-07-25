import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Producto } from './producto.entity';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { BuscarProductoDto } from './dto/buscar-producto.dto';
import { StockActual } from 'src/stock-actual/stock-actual.entity';

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
  // 🔁 Generar SKU si no viene
  if (!dto.sku) {
    dto.sku = this.generateSku(dto.nombre);
  }

  // 🔎 Verificar duplicado por SKU
  const existingSku = await this.repo.findOne({ where: { sku: dto.sku } });
  if (existingSku) {
    throw new ConflictException(`El producto con SKU "${dto.sku}" ya existe.`);
  }

  // 🔍 Verificar si existe un producto con el mismo código de barras
  if (dto.barcode) {
    const existingBarcode = await this.repo.findOne({ where: { barcode: dto.barcode } });

    if (existingBarcode) {
      if (existingBarcode.activo) {
        throw new ConflictException(
          `Ya existe un producto activo con ese código de barras. Nombre: "${existingBarcode.nombre}".`
        );
      } else {
        // 🛠️ Si existe pero está inactivo, lo actualizamos
        existingBarcode.nombre = dto.nombre;
        existingBarcode.descripcion = dto.descripcion;
        existingBarcode.unidad_id = dto.unidad_id;
        existingBarcode.categoria_id = dto.categoria_id;
        existingBarcode.sku = dto.sku;
        existingBarcode.precioBase = dto.precioBase;
        existingBarcode.activo = true;
        existingBarcode.updated_at = new Date();

        return this.repo.save(existingBarcode);
      }
    }
  }

  // ✅ Crear producto normalmente
  const nuevo = this.repo.create(dto);
  return this.repo.save(nuevo);
}


  async findOne(id: number): Promise<Producto> {
  const idParsed = Number(id);

  // Si el ID no es un número entero válido, devolvemos un producto vacío
  if (!Number.isInteger(idParsed)) {
    return this.getDefaultProducto();
  }

  const prod = await this.repo.findOne({
    where: { id: idParsed },
    relations: ['unidad', 'categoria'],
  });

  return prod ?? this.getDefaultProducto();
}
  private getDefaultProducto(): Producto {
    const defaultProducto = new Producto();
    defaultProducto.id = -1; // ID inválido
    defaultProducto.nombre = 'Producto no encontrado';
    defaultProducto.sku = 'N/A';
    defaultProducto.barcode = 'N/A';
    return defaultProducto;
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
  const { nombre, sku, barcode, categoriaId, unidadId, conStock, almacenId } = filtros;

  const query = this.repo.createQueryBuilder('producto')
    .leftJoinAndSelect('producto.unidad', 'unidad')
    .leftJoinAndSelect('producto.categoria', 'categoria')
    .leftJoinAndSelect('producto.stock', 'stock')
    .leftJoinAndMapOne('stock.almacen', 'stock.almacen', 'almacen')
    .where('producto.activo = true'); // si usás borrado lógico

  if (nombre) {
    query.andWhere('producto.nombre ILIKE :nombre', { nombre: `%${nombre}%` });
  }

  if (sku) {
    query.andWhere('producto.sku = :sku', { sku });
  }

  if (barcode) {
    query.andWhere('producto.barcode = :barcode', { barcode });
  }

  if (categoriaId !== undefined && !isNaN(parseInt(categoriaId))) {
    query.andWhere('producto.categoria_id = :categoriaId', { categoriaId: parseInt(categoriaId) });
  }

  if (unidadId !== undefined && !isNaN(parseInt(unidadId))) {
    query.andWhere('producto.unidad_id = :unidadId', { unidadId: parseInt(unidadId) });
  }

  if (almacenId !== undefined && !isNaN(parseInt(almacenId))) {
    query.andWhere('stock.almacen_id = :almacenId', { almacenId: parseInt(almacenId) });
  }

  const conStockBool = conStock === 'true';
  if (conStockBool) {
    query.andWhere('stock.cantidad > 0');
  }

  return query.getMany();
}

  


async borrarLogicamente(id: number): Promise<Producto> {
  const producto = await this.findOne(id);
  producto.activo = false;
  return this.repo.save(producto);
}

}