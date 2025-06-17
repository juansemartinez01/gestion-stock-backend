// extraccion-ingreso.controller.ts
import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { ExtraccionIngresoService } from './extraccion-ingreso.service';
import { CreateExtraccionDto } from './dto/create-extraccion.dto';
import { FiltroExtraccionDto } from './dto/filtro-extraccion.dto';

@Controller('extraccion-ingreso')
export class ExtraccionIngresoController {
  constructor(private readonly service: ExtraccionIngresoService) {}

  @Post()
    async crear(@Body() dto: CreateExtraccionDto) {
        return this.service.crear(dto);
  }

  
    @Get()
      async listar(@Query() filtro: FiltroExtraccionDto) {
        return this.service.obtenerConFiltros(filtro);
    }


    @Get('/disponible')
      async obtenerTotales() {
        return this.service.obtenerTotalesDisponibles();
    }
}
