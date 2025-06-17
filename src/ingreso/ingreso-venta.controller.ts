import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { IngresoVentaService } from './ingreso-venta.service';
import { CreateIngresoVentaDto } from './dto/create-ingreso-venta.dto';
import { FiltroIngresoVentaDto } from './dto/filtro-ingreso-venta.dto';

@Controller('ingreso-venta')
export class IngresoVentaController {
  constructor(private readonly service: IngresoVentaService) {}

  @Post()
  async crear(@Body() dto: CreateIngresoVentaDto) {
    return this.service.registrarIngreso(dto);
  }

  @Get()
  async listar(@Query() filtros: FiltroIngresoVentaDto) {
    return this.service.obtenerTodosConFiltros(filtros);
  }

  @Get('resumen')
  async resumen() {
    return this.service.obtenerResumen();
  }
}
