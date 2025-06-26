import { UsuarioRol } from '../usuario-rol/usuario-rol.entity';
import { Venta } from '../venta/venta.entity';
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm';

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn()
  id: number;// auto-incremental
  

  @Column({ length: 255 })
  nombre: string;

  @Column({ length: 100, unique: true })
  usuario: string;

  @Column({ name: 'clave_hash', length: 255 })
  clave_hash: string;

  @Column({ length: 255, unique: false })
  email: string;

  @OneToMany(() => UsuarioRol, usuarioRol => usuarioRol.usuario)
  roles: UsuarioRol[];

  @OneToMany(() => Venta, venta => venta.usuario)
  ventas: Venta[];

}