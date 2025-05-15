import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { CategoriaService } from './categoria.service';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';
import { Categoria } from './categoria.entity';

@Controller('categorias')
export class CategoriaController {
  constructor(private readonly service: CategoriaService) {}

  @Get()
  getAll(): Promise<Categoria[]> {
    return this.service.findAll();
  }

  @Get(':id')
  getOne(@Param('id') id: string): Promise<Categoria> {
    return this.service.findOne(+id);
  }

  @Post()
  create(@Body() dto: CreateCategoriaDto): Promise<Categoria> {
    return this.service.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCategoriaDto): Promise<Categoria> {
    return this.service.update(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.service.remove(+id);
  }
}
