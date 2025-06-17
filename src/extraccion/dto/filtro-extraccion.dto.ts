// dto/filtro-extraccion.dto.ts
import { IsOptional, IsEnum, IsDateString } from 'class-validator';

export class FiltroExtraccionDto {
  @IsOptional()
  @IsEnum(['EFECTIVO', 'BANCARIZADO'])
  origen?: 'EFECTIVO' | 'BANCARIZADO';

  @IsOptional()
  @IsDateString()
  fechaDesde?: string;

  @IsOptional()
  @IsDateString()
  fechaHasta?: string;
}
