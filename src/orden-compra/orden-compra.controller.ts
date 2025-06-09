// src/orden-compra/orden-compra.controller.ts
import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import { OrdenCompraService } from './orden-compra.service';
import { CreateOrdenCompraDto } from './dto/create-orden-compra.dto';
import { OrdenCompra } from './orden-compra.entity';

@Controller('orden-compra')
export class OrdenCompraController {
  constructor(private readonly service: OrdenCompraService) {}

  @Post()
  create(@Body() dto: CreateOrdenCompraDto): Promise<OrdenCompra> {
    return this.service.create(dto);
  }

  @Get()
  findAll(): Promise<OrdenCompra[]> {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<OrdenCompra> {
    return this.service.findOne(id);
  }
}
