import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Producto } from '../producto/producto.entity';
import { Almacen } from '../almacen/almacen.entity';

@Entity('producto_precio_almacen')
export class ProductoPrecioAlmacen {
  @PrimaryColumn()
  producto_id: number;

  @PrimaryColumn()
  almacen_id: number;

  @ManyToOne(() => Producto, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'producto_id' })
  producto: Producto;

  @ManyToOne(() => Almacen, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'almacen_id' })
  almacen: Almacen;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  precio: string;

  @Column({ type: 'varchar', length: 10, default: 'ARS' })
  moneda: string;
}
