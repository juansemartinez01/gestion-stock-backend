import { Body, Controller, Delete, Get, Param, ParseBoolPipe, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { GastosService } from './gastos.service';
import { CreateGastoDto } from './dto/create-gasto.dto';
import { UpdateGastoDto } from './dto/update-gasto.dto';
import { FiltroGastoDto } from './dto/filtro-gasto.dto';

@Controller('gastos')
export class GastosController {
  constructor(private readonly service: GastosService) {}

  @Post()
  crear(@Body() dto: CreateGastoDto) {
    return this.service.crear(dto);
  }

  @Patch(':id')
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateGastoDto) {
    return this.service.actualizar(id, dto);
  }

  @Get(':id')
  obtener(@Param('id', ParseIntPipe) id: number, @Query('incluirEliminados') incluirEliminados?: 'true' | 'false') {
    return this.service.obtenerPorId(id, incluirEliminados === 'true');
  }

  @Get()
  listar(@Query() filtro: FiltroGastoDto) {
    return this.service.listar(filtro);
  }

  @Delete(':id')
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.service.eliminar(id);
  }

  // Endpoint opcional para hard delete (podés quitarlo si no lo querés)
  @Delete(':id/hard')
  eliminarDef(@Param('id', ParseIntPipe) id: number) {
    return this.service.eliminarDefinitivo(id);
  }
}
