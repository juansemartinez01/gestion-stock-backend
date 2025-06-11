import { IsInt } from 'class-validator';

export class CreateVentaPromoDto {
  @IsInt()
  promocionId: number;

  @IsInt()
  cantidad: number;
}
