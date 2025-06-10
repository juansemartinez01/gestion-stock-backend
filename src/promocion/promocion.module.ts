import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Promocion } from './promocion.entity';
import { PromocionProducto } from './promocion-producto.entity';
import { PromocionService } from './promocion.service';
import { PromocionController } from './promocion.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Promocion, PromocionProducto])],
  providers: [PromocionService],
  controllers: [PromocionController],
})
export class PromocionModule {}
