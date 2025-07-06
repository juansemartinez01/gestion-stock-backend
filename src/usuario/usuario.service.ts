import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from './usuario.entity';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import * as bcrypt from 'bcrypt';
import { UsuarioRol } from 'src/usuario-rol/usuario-rol.entity';
import { Roles } from 'src/auth/roles.decorator';
import { Role } from 'src/role/role.entity';

@Injectable()
export class UsuarioService {
  constructor(
    @InjectRepository(Usuario)
    private readonly repo: Repository<Usuario>,
    @InjectRepository(UsuarioRol)
    private readonly usuarioRolRepo: Repository<UsuarioRol>,
    @InjectRepository(Roles)
    private readonly rolRepo: Repository<Role>,
  ) {}

  

  // For authentication: find by username and include roles
  async findByUsername(usuario: string): Promise<Usuario | null> {
    return this.repo.findOne({
      where: { usuario },
      relations: ['roles', 'roles.rol'],
    });
  }

  findAll(): Promise<Usuario[]> {
    return this.repo.find({ relations: ['roles', 'roles.rol'] });
  }

  async findOne(id: number): Promise<Usuario> {
    const user = await this.repo.findOne({
      where: { id },
      relations: ['roles', 'roles.rol'],
    });
    if (!user) throw new NotFoundException(`Usuario ${id} no encontrado`);
    return user;
  }

  async create(dto: CreateUsuarioDto): Promise<Usuario> {
  const user = new Usuario();
  user.nombre = dto.nombre;
  user.usuario = dto.usuario;
  user.email = dto.email;
  // generamos el hash aquí
  user.clave_hash = await bcrypt.hash(dto.password, 10);
  return this.repo.save(user);
}

  async update(id: number, dto: UpdateUsuarioDto): Promise<Usuario> {
    const usuario = await this.findOne(id);

    if (dto.usuario && dto.usuario !== usuario.usuario) {
      const existente = await this.repo.findOne({ where: { usuario: dto.usuario } });
      if (existente) {
        throw new BadRequestException(`El nombre de usuario '${dto.usuario}' ya está en uso.`);
      }
      usuario.usuario = dto.usuario;
    }

    if (dto.nombre !== undefined) usuario.nombre = dto.nombre;
    if (dto.email !== undefined) usuario.email = dto.email;

    if (dto.password !== undefined && dto.password.trim() !== '') {
      usuario.clave_hash = await bcrypt.hash(dto.password, 10);
    }

    // Actualizar roles si se enviaron
    if (dto.roles) {
      // Eliminar roles actuales
      await this.usuarioRolRepo.delete({ usuario: { id } });

      // Insertar nuevos roles
      const nuevosRoles: UsuarioRol[] = dto.roles.map(rolId => {
        const usuarioRol = new UsuarioRol();
        usuarioRol.usuario = usuario;
        usuarioRol.rol = { id: rolId } as Role;
        return usuarioRol;
      });

      await this.usuarioRolRepo.save(nuevosRoles);
    }

    await this.repo.save(usuario);
    return this.findOne(id);
  }



  async remove(id: number): Promise<void> {
    const res = await this.repo.delete(id);
    if (res.affected === 0) throw new NotFoundException(`Usuario ${id} no encontrado`);
  }
}