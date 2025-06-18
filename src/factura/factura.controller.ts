import {
  Controller,
  Post,
  Body,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FacturaService } from './factura.service';
import { CreateFacturaDto } from './dto/create-factura.dto';

@Controller('factura')
export class FacturaController {
  constructor(private readonly facturaService: FacturaService) {}

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async crearFactura(@Body() dto: CreateFacturaDto) {
    return await this.facturaService.create(dto);
  }
}
