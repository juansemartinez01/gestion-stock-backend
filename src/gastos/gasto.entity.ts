import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

@Entity('gasto')
@Index('idx_gasto_fecha', ['fecha'])
@Index('idx_gasto_monto', ['monto'])
export class Gasto {
  @PrimaryGeneratedColumn()
  id: number;

  // Fecha del gasto (date puro para evitar líos de zona horaria)
  @Column({ type: 'date' })
  fecha: string; // 'YYYY-MM-DD'

  // Monto positivo con 2 decimales
  @Column({ type: 'numeric', precision: 14, scale: 2 })
  monto: string; // guardar como string por numeric de PG

  // Descripción breve
  @Column({ type: 'varchar', length: 255 })
  descripcion: string;

  // Campo opcional para notas largas
  @Column({ type: 'text', nullable: true })
  notas?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date | null;
}
