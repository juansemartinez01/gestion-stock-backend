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

  @ManyToOne(() => Producto, { eager: true,nullable: true })
  @JoinColumn({ name: 'producto_id' })
  producto: Producto | null;

    // ...
  @Column({ type: 'int', nullable: true })
  cantidad: number | null; // piezas

  @Column({ type: 'numeric', precision: 12, scale: 3, nullable: true })
  cantidad_gramos: string | null; // gramos
  // ...


  @Column({ type: 'decimal', precision: 12, scale: 2 })
  precioUnitario: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal: number;
}
