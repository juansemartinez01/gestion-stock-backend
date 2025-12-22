import { Controller, Get, Post, Body, Param, Query, BadRequestException, Put } from '@nestjs/common';
import { VentaService } from './venta.service';
import { CreateVentaDto } from './dto/create-venta.dto';
import { Venta } from './venta.entity';
import { UsuarioService } from '../usuario/usuario.service';
import { EstadisticasVentasDto } from './dto/estadisticas-ventas.dto';
import { UpdateEstadoVentaDto } from './dto/update-estado-venta.dto';
import { CreateVentaMixtaDto } from './dto/create-venta-mixta.dto';

@Controller('ventas')
export class VentaController {
  constructor(
    private readonly service: VentaService,
    private readonly usuarioService: UsuarioService,
  ) {}

  @Post()
  async create(@Body() dto: CreateVentaDto) {
    const usuario = await this.usuarioService.findOne(dto.usuarioId);
    return this.service.create({ ...dto, usuario });
  }

  @Post('mixta')
  async createMixta(@Body() dto: CreateVentaMixtaDto) {
    const usuario = await this.usuarioService.findOne(dto.usuarioId);
    return this.service.crearVentaMixta({ ...dto, usuario });
  }

  @Get()
  async obtenerVentas(
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
    @Query('horaDesde') horaDesde?: string, // ⬅️ nuevo
    @Query('horaHasta') horaHasta?: string, // ⬅️ nuevo
    @Query('usuarioId') usuarioId?: string,
    @Query('estado') estado?: string,
    @Query('almacenId') almacenId?: string,
    @Query('tipo') tipo?: 'EFECTIVO' | 'BANCARIZADO',
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
    @Query('ordenCampo') ordenCampo: string = 'fecha',
    @Query('ordenDireccion') ordenDireccion: 'ASC' | 'DESC' = 'DESC',
  ) {
    return this.service.obtenerTodasConFiltros({
      fechaDesde,
      fechaHasta,
      horaDesde, // ⬅️
      horaHasta, // ⬅️
      usuarioId,
      estado,
      almacenId,
      tipo,
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

  @Get('ingresos-por-categoria')
  obtenerTotalPorCategoria(
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
  ) {
    return this.service.obtenerTotalPorCategoria(fechaDesde, fechaHasta);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    const idNum = parseInt(id, 10);
    if (isNaN(idNum)) throw new BadRequestException('ID inválido');
    return this.service.findOne(idNum);
  }

  @Put(':id/estado')
  actualizarEstado(
    @Param('id') id: number,
    @Body() dto: UpdateEstadoVentaDto,
  ): Promise<Venta> {
    return this.service.actualizarEstado(+id, dto);
  }

  @Get(':id/completa')
  getVentaCompleta(@Param('id') id: string) {
    const idNum = parseInt(id, 10);
    if (isNaN(idNum)) throw new BadRequestException('ID inválido');
    return this.service.getVentaCompleta(idNum);
  }
}