import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('unidad')
export class Unidad {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50 })
  nombre: string;

  @Column({ length: 20, nullable: true })
  abreviatura: string;
}
