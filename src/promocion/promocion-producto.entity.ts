import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  JoinColumn,
} from 'typeorm';
import { Promocion } from './promocion.entity';
import { Producto } from '../producto/producto.entity';

@Entity('promocion-producto')
export class PromocionProducto {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Promocion, promo => promo.productos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'promocion_id' })
  promocion: Promocion;

  @ManyToOne(() => Producto, { eager: true })
  @JoinColumn({ name: 'producto_id' })
  producto: Producto;

  @Column('int')
  cantidad: number;
}
