import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IngresoVenta } from './ingreso-venta.entity';
import { Venta } from '../venta/venta.entity';
import { IngresoVentaService } from './ingreso-venta.service';
import { IngresoVentaController } from './ingreso-venta.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([IngresoVenta, Venta]),
  ],
  controllers: [IngresoVentaController],
  providers: [IngresoVentaService],
  exports: [TypeOrmModule],
})
export class IngresoVentaModule {}
