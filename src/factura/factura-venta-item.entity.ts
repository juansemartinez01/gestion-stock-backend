import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
} from 'typeorm';
import { Factura } from './factura.entity';
import { VentaItem } from '../venta/venta-item.entity';

@Entity('factura_venta_item')
export class FacturaVentaItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Factura, (factura) => factura.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'factura_id' })
  factura: Factura;

  @ManyToOne(() => VentaItem)
  @JoinColumn({ name: 'venta_item_id' })
  ventaItem: VentaItem;

  @Column('int')
  cantidad: number;

  @Column('decimal', { precision: 12, scale: 2 })
  subtotal: number;
}

