import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockActual } from './stock-actual.entity';
import { CreateStockActualDto } from './dto/create-stock-actual.dto';
import { UpdateStockActualDto } from './dto/update-stock-actual.dto';

@Injectable()
export class StockActualService {
  constructor(
    @InjectRepository(StockActual)
    private readonly repo: Repository<StockActual>,
  ) {}

  findAll(): Promise<StockActual[]> {
    return this.repo.find({ relations: ['producto', 'almacen'] });
  }

  async findOne(
    producto_id: number,
    almacen_id: number,
  ): Promise<StockActual> {
    const stock = await this.repo.findOne({
      where: { producto_id, almacen_id },
      relations: ['producto', 'almacen'],
    });
    if (!stock)
      throw new NotFoundException(
        `Stock no encontrado para producto ${producto_id} en almacén ${almacen_id}`,
      );
    return stock;
  }

  async create(dto: CreateStockActualDto): Promise<StockActual> {
    const stock = this.repo.create(dto);
    return this.repo.save(stock);
  }

  async update(
    producto_id: number,
    almacen_id: number,
    dto: UpdateStockActualDto,
  ): Promise<StockActual> {
    await this.repo.update({ producto_id, almacen_id }, dto as any);
    return this.findOne(producto_id, almacen_id);
  }

  async remove(producto_id: number, almacen_id: number): Promise<void> {
    const res = await this.repo.delete({ producto_id, almacen_id });
    if (res.affected === 0)
      throw new NotFoundException(
        `Stock no encontrado para producto ${producto_id} en almacén ${almacen_id}`,
      );
  }

  /**
   * Cambia el stock de un producto en un almacén dado.
   * @param productoId ID del producto a actualizar
   * @param almacenId  ID del almacén
   * @param delta      Positivo para incrementar, negativo para decrementar
   */
  async changeStock(
    productoId: number,
    almacenId: number,
    delta: number,
  ): Promise<StockActual> {
    // 1) Busca la fila existente
    const stock = await this.repo.findOne({
      where: {
        producto: { id: productoId },
        almacen: { id: almacenId },
      },
    });

    if (!stock) {
      throw new NotFoundException(
        `No existe stock para producto ${productoId} en almacén ${almacenId}`,
      );
    }

    // 2) Aplica el cambio y actualiza la fecha
    stock.cantidad += delta;
    stock.last_updated = new Date();

    // 3) Guarda y devuelve el registro actualizado
    return this.repo.save(stock);
  }

  async getStockByAlmacen(almacenId: number) {
  const stockPorAlmacen = await this.repo.find({
    where: { almacen: { id: almacenId } },
    relations: ['producto', 'almacen'],
  });

  const stockTotalPorProducto = await this.repo
    .createQueryBuilder('stock')
    .select('stock.producto_id', 'productoId')
    .addSelect('SUM(stock.cantidad)', 'cantidadTotal')
    .groupBy('stock.producto_id')
    .getRawMany();

  return {
    almacenId,
    productosEnAlmacen: stockPorAlmacen,
    stockTotalPorProducto: stockTotalPorProducto.map((item) => ({
      productoId: +item.productoId,
      cantidadTotal: +item.cantidadTotal,
    })),
  };
}
}