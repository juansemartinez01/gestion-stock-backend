import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, JoinColumn } from 'typeorm';
import { VentaItem } from './venta-item.entity';

@Entity('venta')
export class Venta {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn({ type: 'timestamp' })
  fecha: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total: number;

  @Column({ type: 'varchar', length: 20, default: 'PENDIENTE' })
  estado: string;

  @Column({ type: 'varchar', length: 255, default: 'Admin' })
  usuario: String;

  @OneToMany(() => VentaItem, item => item.venta, { cascade: true, eager: true })
  items: VentaItem[];
}
