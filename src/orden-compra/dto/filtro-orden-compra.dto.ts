import { IsOptional, IsNumberString, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class FiltroOrdenCompraDto {
  @IsOptional()
  @IsString()
  fechaDesde?: string;

  @IsOptional()
  @IsString()
  fechaHasta?: string;

  @IsOptional()
  @IsString()
  proveedorId?: string;

  @IsOptional()
  @Type(() => Number)
  pagina?: number = 1;

  @IsOptional()
  @Type(() => Number)
  limite?: number = 50;
}
