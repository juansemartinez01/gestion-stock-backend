// src/orden-compra/orden-compra.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrdenCompra } from './orden-compra.entity';
import { OrdenCompraItem } from './orden-compra-item.entity';
import { CreateOrdenCompraDto } from './dto/create-orden-compra.dto';
import { ProveedorService } from '../proveedor/proveedor.service';
import { ProductoService } from '../producto/producto.service';

@Injectable()
export class OrdenCompraService {
  constructor(
    @InjectRepository(OrdenCompra)
    private ordenRepo: Repository<OrdenCompra>,

    @InjectRepository(OrdenCompraItem)
    private itemRepo: Repository<OrdenCompraItem>,

    private proveedorService: ProveedorService,
    private productoService: ProductoService,
  ) {}

  async create(dto: CreateOrdenCompraDto): Promise<OrdenCompra> {
    const proveedor = await this.proveedorService.findOne(dto.proveedorId);
    const orden = this.ordenRepo.create({
      proveedor,
      fecha: new Date(dto.fecha),
      items: [],
    });

    orden.items = await Promise.all(
      dto.items.map(async itemDto => {
        const producto = await this.productoService.findOne(itemDto.productoId);
        const subtotal = itemDto.cantidad * itemDto.precioUnitario;
        return this.itemRepo.create({
          orden,
          producto,
          cantidad: itemDto.cantidad,
          precioUnitario: itemDto.precioUnitario,
          subtotal,
        });
      }),
    );

    orden.total = orden.items.reduce((sum, it) => sum + Number(it.subtotal), 0);
    return this.ordenRepo.save(orden);
  }

  findAll(): Promise<OrdenCompra[]> {
    return this.ordenRepo.find({
      relations: ['proveedor', 'items', 'items.producto'],
    });
  }

  async findOne(id: number): Promise<OrdenCompra> {
    const orden = await this.ordenRepo.findOne({
      where: { id },
      relations: ['proveedor', 'items', 'items.producto'],
    });
    if (!orden) {
      throw new Error(`OrdenCompra with id ${id} not found`);
    }
    return orden;
  }
}
