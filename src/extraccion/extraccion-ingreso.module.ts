import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExtraccionIngreso } from './extraccion-ingreso.entity';
import { IngresoVenta } from '../ingreso/ingreso-venta.entity';
import { ExtraccionIngresoService } from './extraccion-ingreso.service';
import { ExtraccionIngresoController } from './extraccion-ingreso.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ExtraccionIngreso,
      IngresoVenta,
    ]),
  ],
  controllers: [ExtraccionIngresoController],
  providers: [ExtraccionIngresoService],
})
export class ExtraccionIngresoModule {}
