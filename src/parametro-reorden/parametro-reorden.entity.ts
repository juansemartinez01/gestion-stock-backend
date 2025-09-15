// src/parametro-reorden/parametro-reorden.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { Producto } from '../producto/producto.entity';

const numericTransformer = {
  to: (value: number | null) => value,                       // se guarda tal cual
  from: (value: string | null) => (value == null ? null : Number(value)), // DB -> number
};

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

  // ahora numeric con 3 decimales y transformer a number
  @Column({
    name: 'nivel_minimo',
    type: 'numeric',
    precision: 18,
    scale: 3,
    transformer: numericTransformer,
  })
  nivel_minimo: number;

  @Column({
    name: 'nivel_optimo',
    type: 'numeric',
    precision: 18,
    scale: 3,
    transformer: numericTransformer,
  })
  nivel_optimo: number;
}
