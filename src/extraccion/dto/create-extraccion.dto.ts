// dto/create-extraccion.dto.ts
import { IsEnum, IsNotEmpty, IsNumber, Min, MaxLength } from 'class-validator';

export class CreateExtraccionDto {
  @IsEnum(['EFECTIVO', 'BANCARIZADO'])
  origen: 'EFECTIVO' | 'BANCARIZADO';

  @IsNumber()
  @Min(0.01)
  monto: number;

  @IsNotEmpty()
  @MaxLength(500)
  motivo: string;
}
