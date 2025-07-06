import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from './usuario.entity';
import { UsuarioService } from './usuario.service';
import { UsuarioController } from './usuario.controller';
import { UsuarioRol } from '../usuario-rol/usuario-rol.entity';
import { Role } from '../role/role.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Usuario, UsuarioRol, Role]) // 👈 agregamos los repos necesarios
  ],
  providers: [UsuarioService],
  controllers: [UsuarioController],
  exports: [UsuarioService],
})
export class UsuarioModule {}
