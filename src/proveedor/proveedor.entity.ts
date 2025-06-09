import { OrdenCompra } from 'src/orden-compra/orden-compra.entity';
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';

@Entity('proveedor')
export class Proveedor {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  nombre: string;

  @Column({ length: 255, nullable: true })
  contacto?: string;

  @Column({ length: 50, nullable: true })
  telefono?: string;

  @Column({ length: 100, nullable: true })
  email?: string;
  
  @OneToMany(() => OrdenCompra, oc => oc.proveedor)
  compras: OrdenCompra[];
}