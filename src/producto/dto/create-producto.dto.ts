import { IsString, IsNotEmpty, MaxLength, IsOptional, IsInt, IsNumber } from 'class-validator';

export class CreateProductoDto {
  @IsString()
  @IsOptional()
  @MaxLength(50)
  sku?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  nombre: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsInt()
  unidad_id: number;

  @IsInt()
  @IsOptional()
  categoria_id?: number;

  

  @IsNumber({ maxDecimalPlaces: 2 })
  precioBase: number; 

  @IsString()
  @IsOptional()
  @MaxLength(100)
  barcode: string;
}
