import { IsInt, IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';

export class UpsertPrecioDto {
  @IsInt() producto_id: number;
  @IsInt() almacen_id: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Min(0.01)
  precio: number;

  @IsOptional()
  @IsString()
  moneda?: string; // default 'ARS'
}
