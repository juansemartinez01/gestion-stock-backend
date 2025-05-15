import { IsInt, IsNumber } from 'class-validator';

export class CreateVentaItemDto {
  @IsInt()
  productoId: number;

  @IsInt()
  cantidad: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  precioUnitario: number;
}