import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Producto } from './producto.entity';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { BuscarProductoDto } from './dto/buscar-producto.dto';
import { StockActual } from 'src/stock-actual/stock-actual.entity';
import { ProductoPrecioAlmacen } from 'src/producto-precio-almacen/producto-precio-almacen.entity';


@Injectable()
export class ProductoService {
  constructor(
    @InjectRepository(Producto)
    private readonly repo: Repository<Producto>,

    @InjectRepository(ProductoPrecioAlmacen)
    private readonly ppaRepo: Repository<ProductoPrecioAlmacen>,
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




  // ────────────────────────────────────────────────────────────────────────────
  // PRECIO POR ALMACÉN (OVERRIDE SIMPLE)
  // ────────────────────────────────────────────────────────────────────────────

  /** Devuelve el precio final (override si existe, si no precioBase) */
  async getPrecioFinal(productoId: number, almacenId?: number): Promise<number> {
    const prod = await this.repo.findOne({ where: { id: productoId } });
    if (!prod) throw new NotFoundException(`Producto ${productoId} no encontrado`);

    if (almacenId) {
      const override = await this.ppaRepo.findOne({
        where: { producto_id: productoId, almacen_id: almacenId },
      });
      if (override?.precio != null) return Number(override.precio);
    }
    return Number(prod.precioBase ?? 0);
  }

  /** Upsert del precio por almacén */
  async upsertPrecioAlmacen(input: { producto_id: number; almacen_id: number; precio: number; moneda?: string; }) {
    const { producto_id, almacen_id, precio, moneda } = input;
    if (precio <= 0) throw new BadRequestException('El precio debe ser > 0');

    // aseguramos que el producto exista (útil para 404 claras)
    const prod = await this.repo.findOne({ where: { id: producto_id } });
    if (!prod) throw new NotFoundException(`Producto ${producto_id} no encontrado`);

    const current = await this.ppaRepo.findOne({ where: { producto_id, almacen_id } });

    if (current) {
      current.precio = String(precio);
      if (moneda) current.moneda = moneda;
      return this.ppaRepo.save(current);
    } else {
      const nuevo = this.ppaRepo.create({
        producto_id,
        almacen_id,
        precio: String(precio),
        moneda: moneda ?? 'ARS',
      });
      return this.ppaRepo.save(nuevo);
    }
  }

  /** Elimina el override y vuelve a usar precioBase */
  async removePrecioAlmacen(producto_id: number, almacen_id: number) {
    const res = await this.ppaRepo.delete({ producto_id, almacen_id });
    if (!res.affected) {
      throw new NotFoundException(`No existe override para producto ${producto_id} en almacén ${almacen_id}`);
    }
    return { ok: true };
  }
  


async create(dto: CreateProductoDto): Promise<Producto> {
  // 🔧 Normalización básica
  dto.nombre = dto.nombre?.trim();
  dto.sku = (dto.sku?.trim() || this.generateSku(dto.nombre)).toUpperCase();
  dto.descripcion = dto.descripcion?.trim();
  dto.barcode = dto.barcode?.trim();

  // 🔎 Lookups iniciales
  const [existingSku, existingBarcode] = await Promise.all([
    this.repo.findOne({ where: { sku: dto.sku } }),
    dto.barcode ? this.repo.findOne({ where: { barcode: dto.barcode } }) : Promise.resolve(null),
  ]);

  // 🧩 Si hay SKU existente y no es el mismo registro del barcode hallado, es conflicto
  if (existingSku && (!existingBarcode || existingSku.id !== existingBarcode.id)) {
    throw new ConflictException(`El producto con SKU "${dto.sku}" ya existe.`);
  }

  // 🔍 Si existe el barcode
  if (existingBarcode) {
    if (existingBarcode.activo) {
      // Ya hay uno activo con ese código de barras
      throw new ConflictException(
        `Ya existe un producto activo con ese código de barras. (ID ${existingBarcode.id}, Nombre: "${existingBarcode.nombre}")`
      );
    }

    // ♻️ Reactivar y actualizar SOLO lo que venga en el DTO
    existingBarcode.nombre = dto.nombre; // requerido

    if (dto.descripcion !== undefined) {
      existingBarcode.descripcion = dto.descripcion; // puede ser string o undefined
    }

    // Tenés columnas crudas *_id, así que asignamos IDs directamente
    if (dto.unidad_id !== undefined) {
      existingBarcode.unidad_id = dto.unidad_id;
    }
    if (dto.categoria_id !== undefined) {
      existingBarcode.categoria_id = dto.categoria_id;
    }

    // SKU ya validado arriba para no chocar con terceros
    if (dto.sku !== undefined) {
      existingBarcode.sku = dto.sku;
    }

    if (dto.precioBase !== undefined) {
      existingBarcode.precioBase = dto.precioBase;
    }

    // Por si el inactivo tenía barcode nulo y ahora viene uno válido
    if (dto.barcode !== undefined) {
      if (dto.barcode !== undefined && dto.barcode !== null) {
        existingBarcode.barcode = dto.barcode;
      }
    }

    existingBarcode.activo = true; // reactivamos
    // No seteamos updated_at: lo maneja @UpdateDateColumn

    // Guardamos y devolvemos
    return this.repo.save(existingBarcode);
  }

  // ✅ Crear producto normalmente (sin barcode existente)
  const nuevo = this.repo.create({
    sku: dto.sku,
    nombre: dto.nombre,
    descripcion: dto.descripcion ?? null,
    unidad_id: dto.unidad_id,
    categoria_id: dto.categoria_id ?? null,
    precioBase: dto.precioBase,
    barcode: dto.barcode ?? null,
    activo: true,
  } as Partial<Producto>);

  return this.repo.save(nuevo) as unknown as Promise<Producto>;
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


  const productos = await query.getMany();
  // Si viene almacenId, resolvemos precio final agregando override si existe.
    if (almacenId && productos.length) {
      const ids = productos.map(p => p.id);
      const overrides = await this.ppaRepo.find({
        where: { producto_id: In(ids), almacen_id: Number(almacenId) },
      });
      const mapOverride = new Map<number, number>();
      overrides.forEach(o => mapOverride.set(o.producto_id, Number(o.precio)));

      // Adjuntamos un campo "precioFinal" a cada objeto (sin tocar el schema de la entidad)
      for (const p of productos) {
        (p as any).precioFinal =
          mapOverride.get(p.id) ?? Number(p.precioBase ?? 0);
      }
    } else {
      // Si no vino almacen, devolvemos precioBase como precioFinal para consistencia
      for (const p of productos) {
        (p as any).precioFinal = Number(p.precioBase ?? 0);
      }
    }
  return productos;
}

  


async borrarLogicamente(id: number): Promise<Producto> {
  const producto = await this.findOne(id);
  producto.activo = false;
  return this.repo.save(producto);
}

}