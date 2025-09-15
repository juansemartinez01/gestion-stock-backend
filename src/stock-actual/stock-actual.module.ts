import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockActualService } from './stock-actual.service';
import { StockActualController } from './stock-actual.controller';
import { StockActual } from './stock-actual.entity';
import { MovimientoStockModule } from 'src/movimiento-stock/movimiento-stock.module';
import { Producto } from 'src/producto/producto.entity';
import { ProductoPrecioAlmacen } from 'src/producto-precio-almacen/producto-precio-almacen.entity';

@Module({
  imports: [TypeOrmModule.forFeature([StockActual,Producto,ProductoPrecioAlmacen]),MovimientoStockModule],
  providers: [StockActualService],
  controllers: [StockActualController],
  exports: [ StockActualService ],
})
export class StockActualModule {}

// Forzar recompilación Railway