import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  BadRequestException,
  ParseIntPipe,
} from '@nestjs/common';
import { ProductoService } from './producto.service';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { Producto } from './producto.entity';
import { BuscarProductoDto } from './dto/buscar-producto.dto';
import { UpsertPrecioDto } from 'src/producto-precio-almacen/dto/upsert-precio.dto';

@Controller('productos')
export class ProductoController {
  constructor(private readonly service: ProductoService) {}

  // ───────────────────────────────────────────────────────────────────
  // Búsqueda avanzada
  // ───────────────────────────────────────────────────────────────────
  @Get('buscar')
  buscar(@Query() filtros: BuscarProductoDto) {
    return this.service.buscarConFiltros(filtros);
  }

  // ───────────────────────────────────────────────────────────────────
  // Precio por almacén (override)
  // ───────────────────────────────────────────────────────────────────
  @Post('precio-override')
  upsertPrecio(@Body() dto: UpsertPrecioDto) {
    return this.service.upsertPrecioAlmacen(dto);
  }

  @Delete('precio-override/:productoId/:almacenId')
  removePrecio(
    @Param('productoId', ParseIntPipe) productoId: number,
    @Param('almacenId', ParseIntPipe) almacenId: number,
  ) {
    return this.service.removePrecioAlmacen(productoId, almacenId);
  }

  @Get(':id/precio')
  getPrecio(
    @Param('id', ParseIntPipe) id: number,
    @Query('almacenId') almacenId?: string,
  ) {
    return this.service.getPrecioFinal(id, almacenId ? Number(almacenId) : undefined);
  }

  // ───────────────────────────────────────────────────────────────────
  // Buscar por código de barras (antes de :id para evitar colisión)
  // ───────────────────────────────────────────────────────────────────
  @Get('barcode/:code')
  findByBarcode(@Param('code') code: string) {
    return this.service.findByBarcode(code);
  }

  // ───────────────────────────────────────────────────────────────────
  // CRUD base
  // ───────────────────────────────────────────────────────────────────
  @Get()
  getAll(): Promise<Producto[]> {
    return this.service.findAll();
  }

  @Get(':id')
  getOne(@Param('id', ParseIntPipe) id: number): Promise<Producto> {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateProductoDto): Promise<Producto> {
    return this.service.create(dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductoDto,
  ): Promise<Producto> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  async borrarLogico(@Param('id', ParseIntPipe) id: number) {
    return this.service.borrarLogicamente(id);
  }
}
