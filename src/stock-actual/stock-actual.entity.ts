import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Producto } from '../producto/producto.entity';
import { Almacen } from '../almacen/almacen.entity';

@Entity('stock_actual')
export class StockActual {
  @PrimaryColumn({ name: 'producto_id', type: 'int' })
  producto_id: number;

  @PrimaryColumn({ name: 'almacen_id', type: 'int' })
  almacen_id: number;

  @ManyToOne(() => Producto)
  @JoinColumn({ name: 'producto_id' })
  producto: Producto;

  @ManyToOne(() => Almacen)
  @JoinColumn({ name: 'almacen_id' })
  almacen: Almacen;

  @Column({ type: 'int' })
  cantidad: number;

  @UpdateDateColumn({ name: 'last_updated' })
  last_updated: Date;

  // Gramos (usar string para NUMERIC en TypeORM)
  @Column({ type: 'numeric', precision: 18, scale: 3, name: 'cantidad_gramos', nullable: true })
  cantidad_gramos: string | null;

  
}
