// src/orden-compra/orden-compra.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Proveedor } from '../proveedor/proveedor.entity';
import { OrdenCompraItem } from './orden-compra-item.entity';

@Entity('orden_compra')
export class OrdenCompra {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Proveedor, prov => prov.compras, { nullable: false })
  @JoinColumn({ name: 'proveedor_id' })
  proveedor: Proveedor;

  @Column({ type: 'timestamp' })
  fecha: Date;

  @Column({ type: 'numeric', nullable: true })
  total?: number;

  @OneToMany(() => OrdenCompraItem, item => item.orden, { cascade: true })
  items: OrdenCompraItem[];
}
