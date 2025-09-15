import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  JoinColumn,
  Index,
} from 'typeorm';
import { Promocion } from './promocion.entity';
import { Producto } from '../producto/producto.entity';

@Entity('promocion_producto')
@Index(['promocion', 'producto'], { unique: true }) // opcional: 1 producto por promo
export class PromocionProducto {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Promocion, (promo) => promo.productos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'promocion_id' })
  promocion: Promocion;

  @ManyToOne(() => Producto, { eager: true })
  @JoinColumn({ name: 'producto_id' })
  producto: Producto;

  // --- Piezas (para productos por unidad)
  @Column({ type: 'int', nullable: true })
  cantidad: number | null;

  // --- Gramos (para productos a granel). NUMERIC => string en TS para precisión.
  @Column({ type: 'numeric', precision: 12, scale: 3, nullable: true })
  cantidad_gramos: string | null;
}
