import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParametroReordenService } from './parametro-reorden.service';
import { ParametroReordenController } from './parametro-reorden.controller';
import { ParametroReorden } from './parametro-reorden.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ParametroReorden])],
  providers: [ParametroReordenService],
  controllers: [ParametroReordenController],
})
export class ParametroReordenModule {}