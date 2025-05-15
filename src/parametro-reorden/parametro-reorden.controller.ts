import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { ParametroReordenService } from './parametro-reorden.service';
import { CreateParametroReordenDto } from './dto/create-parametro-reorden.dto';
import { UpdateParametroReordenDto } from './dto/update-parametro-reorden.dto';
import { ParametroReorden } from './parametro-reorden.entity';

@Controller('parametros-reorden')
export class ParametroReordenController {
  constructor(private readonly service: ParametroReordenService) {}

  @Get()
  getAll(): Promise<ParametroReorden[]> {
    return this.service.findAll();
  }

  @Get(':id')
  getOne(@Param('id') id: string): Promise<ParametroReorden> {
    return this.service.findOne(+id);
  }

  @Post()
  create(@Body() dto: CreateParametroReordenDto): Promise<ParametroReorden> {
    return this.service.create(dto);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateParametroReordenDto,
  ): Promise<ParametroReorden> {
    return this.service.update(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.service.remove(+id);
  }
}