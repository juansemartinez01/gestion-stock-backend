import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany, JoinColumn,
} from 'typeorm';
import { Usuario } from '../usuario/usuario.entity';
import { FacturaVentaItem } from './factura-venta-item.entity';

@Entity('facturas')
export class Factura {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('bigint')
  cuit_emisor: number;

  @Column('decimal', { precision: 12, scale: 2 })
  importe_total: number;

  @Column()
  punto_venta: number;

  @Column()
  factura_tipo: number;

  @Column()
  metodo_pago: number;

  @Column({ default: false })
  test: boolean;

  @Column({ nullable: true })
  cae: string;

  @Column({ type: 'timestamp', nullable: true })
  vencimiento_cae: Date;

  @CreateDateColumn()
  fecha: Date;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @OneToMany(() => FacturaVentaItem, (fvi) => fvi.factura, { cascade: true })
  items: FacturaVentaItem[];
}
