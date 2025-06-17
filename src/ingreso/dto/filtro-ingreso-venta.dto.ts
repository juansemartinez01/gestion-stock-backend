// dto/filtro-ingreso-venta.dto.ts
import { IsOptional, IsEnum, IsNumber, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class FiltroIngresoVentaDto {
  @IsOptional()
  @IsEnum(['EFECTIVO', 'BANCARIZADO'])
  tipo?: 'EFECTIVO' | 'BANCARIZADO';

  @IsOptional()
  @Type(() => Number)
  ventaId?: number;

  @IsOptional()
  @Type(() => Number)
  montoMin?: number;

  @IsOptional()
  @Type(() => Number)
  montoMax?: number;

  @IsOptional()
  @IsDateString()
  fechaDesde?: string;

  @IsOptional()
  @IsDateString()
  fechaHasta?: string;
}
