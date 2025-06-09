// src/orden-compra/dto/create-orden-compra-item.dto.ts
import { IsInt, IsNumber } from 'class-validator';

export class CreateOrdenCompraItemDto {
  @IsInt()
  productoId: number;

  @IsInt()
  cantidad: number;

  @IsNumber()
  precioUnitario: number;
}
