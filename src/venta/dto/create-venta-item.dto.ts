import { IsInt, IsNumber, IsOptional, Min, ValidateIf } from 'class-validator';

export class CreateVentaItemDto {
  @IsInt()
  productoId: number;

  // Solo para productos por pieza
  @ValidateIf(o => o.cantidad_gramos == null)
  @IsOptional()
  @IsInt()
  @Min(1)
  cantidad?: number;

  // Solo para productos por gramos
  @ValidateIf(o => o.cantidad == null)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  cantidad_gramos?: number;

  // piezas => por unidad; gramos => por kilogramo
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  precioUnitario: number;

}