import { IsString, IsNotEmpty, MaxLength, IsOptional, IsEmail } from 'class-validator';

export class CreateProveedorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  nombre: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  contacto?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  telefono?: string;

  @IsEmail()
  @IsOptional()
  @MaxLength(100)
  email?: string;
}