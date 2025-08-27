import { IsInt, IsNumber, IsOptional, Min, ValidateIf } from 'class-validator';

export class CreateVentaItemDto {
  @IsInt()
  productoId: number;

  // XOR: o piezas o gramos
  @ValidateIf(o => o.cantidad_gramos === undefined)
  @IsInt() @Min(1)
  @IsOptional()
  cantidad?: number;

  @ValidateIf(o => o.cantidad === undefined)
  @IsNumber({ maxDecimalPlaces: 3 }) @Min(0.001)
  @IsOptional()
  cantidad_gramos?: number;

  // piezas => por unidad; gramos => por kilogramo
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  precioUnitario: number;

}