// src/orden-compra/orden-compra.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdenCompra } from './orden-compra.entity';
import { OrdenCompraItem } from './orden-compra-item.entity';
import { OrdenCompraService } from './orden-compra.service';
import { OrdenCompraController } from './orden-compra.controller';
import { ProveedorModule } from '../proveedor/proveedor.module';
import { ProductoModule } from '../producto/producto.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrdenCompra, OrdenCompraItem]),
    ProveedorModule,
    ProductoModule,
  ],
  providers: [OrdenCompraService],
  controllers: [OrdenCompraController],
})
export class OrdenCompraModule {}
