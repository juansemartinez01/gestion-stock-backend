import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateGastoDto {
  @IsDateString({}, { message: 'fecha debe ser YYYY-MM-DD' })
  fecha: string;

  @Transform(({ value }) => (typeof value === 'string' ? Number(value) : value))
  @IsNumber({}, { message: 'monto debe ser numérico' })
  @IsPositive({ message: 'monto debe ser > 0' })
  monto: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  descripcion: string;

  @IsOptional()
  @IsString()
  notas?: string;
}
