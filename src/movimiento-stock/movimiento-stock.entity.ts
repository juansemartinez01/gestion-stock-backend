import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Producto } from '../producto/producto.entity';
import { Almacen } from '../almacen/almacen.entity';
import { Proveedor } from 'src/proveedor/proveedor.entity';

@Entity('movimiento_stock')
export class MovimientoStock {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'producto_id', type: 'int' })
  producto_id: number;

  @ManyToOne(() => Producto)
  @JoinColumn({ name: 'producto_id' })
  producto: Producto;

  @Column({ name: 'origen_almacen', type: 'int', nullable: true })
  origen_almacen?: number;

  @ManyToOne(() => Almacen)
  @JoinColumn({ name: 'origen_almacen' })
  almacenOrigen?: Almacen;

  @Column({ name: 'destino_almacen', type: 'int', nullable: true })
  destino_almacen?: number;

  @ManyToOne(() => Almacen)
  @JoinColumn({ name: 'destino_almacen' })
  almacenDestino?: Almacen;

  @Column({ type: 'int' })
  cantidad: number;

  @Column({ length: 20 })
  tipo: 'entrada' | 'salida' | 'traspaso';

  @CreateDateColumn({ name: 'fecha' })
  fecha: Date;

  @Column({ name: 'usuario_id', type: 'int', nullable: true })
  usuario_id?: number;

  @Column({ type: 'text', nullable: true })
  motivo?: string;

  @Column({ name: 'proveedor_id', nullable: true })
    proveedor_id?: number;
  
  @ManyToOne(() => Proveedor)
  @JoinColumn({ name: 'proveedor_id' })
  proveedor?: Proveedor;

  @Column({ name: 'precio_unitario', type: 'decimal', precision: 12, scale: 2, nullable: true })
  precioUnitario?: number;

  @Column({ name: 'precio_total', type: 'decimal', precision: 12, scale: 2, nullable: true })
  precioTotal?: number;
}