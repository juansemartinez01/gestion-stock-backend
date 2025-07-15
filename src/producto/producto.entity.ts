import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Unidad } from '../unidad/unidad.entity';
import { Categoria } from '../categoria/categoria.entity';
import { Proveedor } from '../proveedor/proveedor.entity';
import { OrdenCompraItem } from '../orden-compra/orden-compra-item.entity';
import { StockActual } from 'src/stock-actual/stock-actual.entity';

@Entity('producto')
export class Producto {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50, unique: true })
  sku: string;

  @Column({ length: 255 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;

  @Column({ name: 'unidad_id' })
  unidad_id: number;

  @ManyToOne(() => Unidad)
  @JoinColumn({ name: 'unidad_id' })
  unidad: Unidad;

  @Column({ name: 'categoria_id', nullable: true })
  categoria_id?: number;

  @ManyToOne(() => Categoria)
  @JoinColumn({ name: 'categoria_id' })
  categoria?: Categoria;

  

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @Column({ type: 'varchar', length: 100, unique: true, nullable: true })
  barcode: string;

   @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
   precioBase: number;

   @OneToMany(() => OrdenCompraItem, item => item.producto)
    compras: OrdenCompraItem[];

      @OneToMany(() => StockActual, stock => stock.producto)
  stock: StockActual[];
}