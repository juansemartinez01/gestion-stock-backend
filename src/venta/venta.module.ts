import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Venta } from './venta.entity';
import { VentaItem } from './venta-item.entity';
import { VentaService } from './venta.service';
import { VentaController } from './venta.controller';
import { ProductoModule } from '../producto/producto.module';

import { StockActualModule } from '../stock-actual/stock-actual.module';
import { MovimientoStockModule } from '../movimiento-stock/movimiento-stock.module';
import { UsuarioModule } from '../usuario/usuario.module';
import { PromocionModule } from 'src/promocion/promocion.module';
import { IngresoVentaModule } from 'src/ingreso/ingreso-venta.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Venta, VentaItem]),
    ProductoModule,
    StockActualModule,        // <— para manipular stock_actual
    MovimientoStockModule,
    UsuarioModule,
    PromocionModule,
    IngresoVentaModule,
  ],
  providers: [VentaService],
  controllers: [VentaController],
})
export class VentaModule {}

// Forzar recompilación Railway