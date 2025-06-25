// estadisticas-ventas.dto.ts
import { IsOptional, IsString } from 'class-validator';

export class EstadisticasVentasDto {
  @IsOptional()
  @IsString()
  fechaDesde?: string;

  @IsOptional()
  @IsString()
  fechaHasta?: string;
}