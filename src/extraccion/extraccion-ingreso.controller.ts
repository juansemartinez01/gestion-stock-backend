// extraccion-ingreso.controller.ts
import { Controller, Post, Body, Get, Query, Delete, Put, Param } from '@nestjs/common';
import { ExtraccionIngresoService } from './extraccion-ingreso.service';
import { CreateExtraccionDto } from './dto/create-extraccion.dto';
import { FiltroExtraccionDto } from './dto/filtro-extraccion.dto';
import { UpdateExtraccionDto } from './dto/update-extraccion.dto';

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

    @Put(':id')
        async editar(@Param('id') id: string, @Body() dto: UpdateExtraccionDto) {
        return this.service.editarExtraccion(+id, dto);
        }

        @Delete(':id')
        async borrar(@Param('id') id: string) {
        return this.service.borrarExtraccion(+id);
}
}
