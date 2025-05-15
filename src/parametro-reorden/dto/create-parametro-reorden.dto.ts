import { IsInt, Min } from 'class-validator';

export class CreateParametroReordenDto {
  @IsInt()
  producto_id: number;

  @IsInt()
  @Min(0)
  nivel_minimo: number;

  @IsInt()
  @Min(0)
  nivel_optimo: number;
}