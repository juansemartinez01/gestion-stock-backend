import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { VentaService } from './venta.service';
import { CreateVentaDto } from './dto/create-venta.dto';
import { Venta } from './venta.entity';

@Controller('ventas')
export class VentaController {
  constructor(private readonly service: VentaService) {}

  @Post()
  create(@Body() dto: CreateVentaDto): Promise<Venta> {
    return this.service.create(dto);
  }

  @Get()
  findAll(): Promise<Venta[]> {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Venta> {
    return this.service.findOne(+id);
  }
}