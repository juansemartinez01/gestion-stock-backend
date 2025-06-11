import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { StockActualService } from './stock-actual.service';
import { CreateStockActualDto } from './dto/create-stock-actual.dto';
import { UpdateStockActualDto } from './dto/update-stock-actual.dto';
import { StockActual } from './stock-actual.entity';

@Controller('stock-actual')
export class StockActualController {
  constructor(private readonly service: StockActualService) {}

  @Get()
  getAll(): Promise<StockActual[]> {
    return this.service.findAll();
  }

  @Get('almacen/:almacenId')
  async getStockByAlmacen(@Param('almacenId') almacenId: string) {
  return this.service.getStockByAlmacen(+almacenId);
}


  @Get(':productoId/:almacenId')
  getOne(
    @Param('productoId') productoId: string,
    @Param('almacenId') almacenId: string,
  ): Promise<StockActual> {
    return this.service.findOne(+productoId, +almacenId);
  }

  @Post('entrada')
    registrarEntrada(@Body() dto: CreateStockActualDto): Promise<StockActual> {
  return this.service.registrarEntrada(dto);
  }

  @Post()
  create(@Body() dto: CreateStockActualDto): Promise<StockActual> {
    return this.service.create(dto);
  }

  @Put(':productoId/:almacenId')
  update(
    @Param('productoId') productoId: string,
    @Param('almacenId') almacenId: string,
    @Body() dto: UpdateStockActualDto,
  ): Promise<StockActual> {
    return this.service.update(+productoId, +almacenId, dto);
  }

  @Delete(':productoId/:almacenId')
  remove(
    @Param('productoId') productoId: string,
    @Param('almacenId') almacenId: string,
  ): Promise<void> {
    return this.service.remove(+productoId, +almacenId);
  }
}
