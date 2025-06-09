import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { VentaService } from './venta.service';
import { CreateVentaDto } from './dto/create-venta.dto';
import { Venta } from './venta.entity';
import { UsuarioService } from '../usuario/usuario.service';

@Controller('ventas')
export class VentaController {
  constructor(private readonly service: VentaService,
    private readonly usuarioService: UsuarioService,
  ) {}

  @Post()
  async create(@Body() dto: CreateVentaDto) {
    const usuario = await this.usuarioService.findOne(dto.usuarioId);
    return this.service.create({ ...dto, usuario });
  }

  @Get()
  findAll(): Promise<Venta[]> {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Venta> {
    return this.service.findOne(+id);
  }
}