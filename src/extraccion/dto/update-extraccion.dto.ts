// dto/update-extraccion.dto.ts
import { IsEnum, IsNumber, IsOptional, MaxLength, Min } from 'class-validator';

export class UpdateExtraccionDto {
  @IsOptional()
  @IsEnum(['EFECTIVO', 'BANCARIZADO'])
  origen?: 'EFECTIVO' | 'BANCARIZADO';

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  monto?: number;

  @IsOptional()
  @MaxLength(500)
  motivo?: string;
}
