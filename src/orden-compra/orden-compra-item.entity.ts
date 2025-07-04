// src/orden-compra/orden-compra-item.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Producto } from '../producto/producto.entity';
import { OrdenCompra } from './orden-compra.entity';

@Entity('orden_compra_item')
export class OrdenCompraItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => OrdenCompra, oc => oc.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orden_compra_id' })
  orden: OrdenCompra;

  @ManyToOne(() => Producto, p => p.compras, { nullable: false })
  @JoinColumn({ name: 'producto_id' })
  producto: Producto;

  @Column('int')
  cantidad: number;

  @Column('numeric')
  precioUnitario: number;

  @Column('numeric')
  subtotal: number;
}
