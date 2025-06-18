import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Factura } from './factura.entity';
import { FacturaVentaItem } from './factura-venta-item.entity';
import { FacturaService } from './factura.service';
import { FacturaController } from './factura.controller';
import { VentaItem } from '../venta/venta-item.entity';
import { Usuario } from '../usuario/usuario.entity';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    TypeOrmModule.forFeature([Factura, FacturaVentaItem, VentaItem, Usuario]),
    HttpModule,
  ],
  controllers: [FacturaController],
  providers: [FacturaService],
})
export class FacturaModule {}
