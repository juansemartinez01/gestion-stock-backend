import { IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';

export class CreateCategoriaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre: string;

  @IsString()
  @IsOptional()
  descripcion?: string;
}