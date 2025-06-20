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
    async getExtraccionesConFiltros(
      @Query('origen') origen?: string,
      @Query('fechaDesde') fechaDesde?: string,
      @Query('fechaHasta') fechaHasta?: string,
      @Query('page') page: string = '1',
      @Query('limit') limit: string = '50',
      @Query('ordenCampo') ordenCampo: string = 'fecha',
      @Query('ordenDireccion') ordenDireccion: 'ASC' | 'DESC' = 'DESC',
    ) {
      const allowedOrigen = origen === 'EFECTIVO' || origen === 'BANCARIZADO' ? origen : undefined;
      return this.service.obtenerConFiltros({
        origen: allowedOrigen,
        fechaDesde,
        fechaHasta,
        page: +page,
        limit: +limit,
        ordenCampo,
        ordenDireccion,
      });
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
