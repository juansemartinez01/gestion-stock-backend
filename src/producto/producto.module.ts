import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductoService } from './producto.service';
import { ProductoController } from './producto.controller';
import { Producto } from './producto.entity';
import { ProductoPrecioAlmacen } from 'src/producto-precio-almacen/producto-precio-almacen.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Producto,ProductoPrecioAlmacen])],
  providers: [ProductoService],
  controllers: [ProductoController],
  exports: [ ProductoService ],
})
export class ProductoModule {}

// Fuerza nuevo build para Railway