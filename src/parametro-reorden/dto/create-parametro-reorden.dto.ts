// src/parametro-reorden/dto/create-parametro-reorden.dto.ts
import { IsInt, IsNumber, Min } from 'class-validator';

export class CreateParametroReordenDto {
  @IsInt()
  producto_id: number;

  // permite decimales (hasta 3)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  nivel_minimo: number;

  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  nivel_optimo: number;
}
