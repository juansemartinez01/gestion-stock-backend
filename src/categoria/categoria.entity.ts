import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('categoria')
export class Categoria {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100, unique: true })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;
}