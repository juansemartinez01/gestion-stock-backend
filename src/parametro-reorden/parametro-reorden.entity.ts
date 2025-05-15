import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { Producto } from '../producto/producto.entity';

@Entity('parametros_reorden')
@Unique(['producto_id'])
export class ParametroReorden {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'producto_id', type: 'int' })
  producto_id: number;

  @ManyToOne(() => Producto, { eager: true })
  @JoinColumn({ name: 'producto_id' })
  producto: Producto;

  @Column({ name: 'nivel_minimo', type: 'int' })
  nivel_minimo: number;

  @Column({ name: 'nivel_optimo', type: 'int' })
  nivel_optimo: number;
}