import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateStockActualDto {
  @IsInt()
  producto_id: number;

  @IsInt()
  almacen_id: number;

  @IsInt()
  @Min(0)
  cantidad: number;

  @IsOptional()
  @IsString()
  motivo?: string;

  @IsInt()
  @IsOptional()
  proveedor_id?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  precioUnitario?: number;
  
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  precioTotal?: number;
}