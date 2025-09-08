// src/orden-compra/dto/create-orden-compra-item.dto.ts
import { IsInt, IsNumber, IsOptional, ValidateIf } from 'class-validator';

export class CreateOrdenCompraItemDto {
  @IsInt()
  productoId: number;

  // Solo para productos por pieza
  @ValidateIf(o => o.cantidad_gramos == null)
  @IsOptional()
  @IsInt()
  cantidad?: number;

  // Solo para productos por gramos (usar gramos, ej: 1250 => 1.250 kg)
  @ValidateIf(o => o.cantidad == null)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  cantidad_gramos?: number;

  @IsNumber()
  precioUnitario: number;
}
