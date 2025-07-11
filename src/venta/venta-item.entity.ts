import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Venta } from './venta.entity';
import { Producto } from '../producto/producto.entity';

@Entity('venta_item')
export class VentaItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Venta, venta => venta.items)
  @JoinColumn({ name: 'venta_id' })
  venta: Venta;

  @ManyToOne(() => Producto, { eager: true })
  @JoinColumn({ name: 'producto_id' })
  producto: Producto;

  @Column({ type: 'integer' })
  cantidad: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  precioUnitario: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal: number;
}
