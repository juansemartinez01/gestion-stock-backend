import { Controller, Post, Body, Get, Param, Delete } from '@nestjs/common';
import { PromocionService } from './promocion.service';
import { CreatePromocionDto } from './dto/create-promocion.dto';

@Controller('promociones')
export class PromocionController {
  constructor(private readonly service: PromocionService) {}

  @Post()
  create(@Body() dto: CreatePromocionDto) {
    return this.service.create(dto);
  }

  @Get('codigo/:codigo')
    findByCodigo(@Param('codigo') codigo: string) {
    return this.service.findByCodigo(codigo);
    }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
}
