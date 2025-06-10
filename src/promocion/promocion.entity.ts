import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { PromocionProducto } from './promocion-producto.entity';

@Entity('promocion')
export class Promocion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  codigo: string;

  @Column('decimal')
  precioPromo: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => PromocionProducto, pp => pp.promocion, { cascade: true })
  productos: PromocionProducto[];
}
