import { IsString, IsNotEmpty, MaxLength, IsEmail, IsInt, IsOptional } from 'class-validator';

export class CreateUsuarioDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  nombre: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  usuario: string;

  @IsString() @IsNotEmpty() password: string;             

  @IsEmail()
  @MaxLength(255)
  email: string;


}
