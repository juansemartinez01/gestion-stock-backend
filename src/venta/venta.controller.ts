import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
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
  async obtenerVentas(
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
    @Query('usuarioId') usuarioId?: string,
    @Query('estado') estado?: string,
  ) {
    return this.service.obtenerTodasConFiltros({ fechaDesde, fechaHasta, usuarioId, estado });
  }


  @Get(':id')
  findOne(@Param('id') id: string): Promise<Venta> {
    return this.service.findOne(+id);
  }
}