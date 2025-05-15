import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MovimientoStockService } from './movimiento-stock.service';
import { MovimientoStockController } from './movimiento-stock.controller';
import { MovimientoStock } from './movimiento-stock.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MovimientoStock])],
  providers: [MovimientoStockService],
  controllers: [MovimientoStockController],
  exports: [ MovimientoStockService ],
})
export class MovimientoStockModule {}
