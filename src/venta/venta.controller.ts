import { Controller, Get, Post, Body, Param, Query, BadRequestException } from '@nestjs/common';
import { VentaService } from './venta.service';
import { CreateVentaDto } from './dto/create-venta.dto';
import { Venta } from './venta.entity';
import { UsuarioService } from '../usuario/usuario.service';
import { EstadisticasVentasDto } from './dto/estadisticas-ventas.dto';

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
    @Query('almacen') almacenId?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
    @Query('ordenCampo') ordenCampo: string = 'fecha',
    @Query('ordenDireccion') ordenDireccion: 'ASC' | 'DESC' = 'DESC',
  ) {
    return this.service.obtenerTodasConFiltros({
      fechaDesde,
      fechaHasta,
      usuarioId,
      estado,
      almacenId,
      page: +page,
      limit: +limit,
      ordenCampo,
      ordenDireccion,
    });
  }

  @Get('estadisticas')
  obtenerEstadisticas(@Query() filtros: EstadisticasVentasDto) {
    return this.service.obtenerEstadisticasVentas(filtros);
  }


  @Get(':id')
  findOne(@Param('id') id: string) {
    const idNum = parseInt(id, 10);
    if (isNaN(idNum)) throw new BadRequestException('ID inválido');
    return this.service.findOne(idNum);
  }

  
}