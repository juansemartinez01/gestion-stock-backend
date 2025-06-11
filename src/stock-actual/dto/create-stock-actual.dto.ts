import { IsInt, IsOptional, IsString, Min } from 'class-validator';

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
}