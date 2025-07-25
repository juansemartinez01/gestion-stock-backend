import { IsString, IsNotEmpty, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ProductoInPromocionDto {
  @IsNumber()
  productoId: number;

  @IsNumber()
  cantidad: number;
}

export class CreatePromocionDto {
  @IsString()
  @IsNotEmpty()
  codigo: string;

  @IsNumber()
  precioPromo: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductoInPromocionDto)
  productos: ProductoInPromocionDto[];
}
