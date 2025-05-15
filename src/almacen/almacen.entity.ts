import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('almacen')
export class Almacen {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  nombre: string;

  @Column({ length: 255, nullable: true })
  ubicacion?: string;

  @Column({ type: 'int', nullable: true })
  capacidad?: number;
}