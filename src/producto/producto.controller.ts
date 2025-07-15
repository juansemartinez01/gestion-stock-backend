import { Controller, Get, Post, Put, Delete, Param, Body, Query, BadRequestException } from '@nestjs/common';
import { ProductoService } from './producto.service';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { Producto } from './producto.entity';
import { BuscarProductoDto } from './dto/buscar-producto.dto';

@Controller('productos')
export class ProductoController {
  constructor(private readonly service: ProductoService) {}

  @Get('buscar')
buscar(@Query() filtros: BuscarProductoDto) {
  return this.service.buscarConFiltros(filtros);
}
  @Get()
  getAll(): Promise<Producto[]> {
    return this.service.findAll();
  }

  @Get(':id')
  getOne(@Param('id') id: string): Promise<Producto> {
    return this.service.findOne(+id);
  }

  @Post()
  create(@Body() dto: CreateProductoDto): Promise<Producto> {
    return this.service.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductoDto): Promise<Producto> {
    return this.service.update(+id, dto);
  }

  @Delete(':id')
async borrarLogico(@Param('id') id: string) {
  const parsedId = parseInt(id, 10);
  if (isNaN(parsedId)) {
    throw new BadRequestException('ID inválido');
  }
  return this.service.borrarLogicamente(parsedId);
}


  // GET /productos/barcode/:code
  @Get('barcode/:code')
  findByBarcode(@Param('code') code: string) {
    return this.service.findByBarcode(code);
  }

  

}