import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { ProveedorService } from './proveedor.service';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';
import { Proveedor } from './proveedor.entity';

@Controller('proveedores')
export class ProveedorController {
  constructor(private readonly service: ProveedorService) {}

  @Get()
  getAll(): Promise<Proveedor[]> {
    return this.service.findAll();
  }

  @Get(':id')
  getOne(@Param('id') id: string): Promise<Proveedor> {
    return this.service.findOne(+id);
  }

  @Post()
  create(@Body() dto: CreateProveedorDto): Promise<Proveedor> {
    return this.service.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProveedorDto): Promise<Proveedor> {
    return this.service.update(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.service.remove(+id);
  }
}
