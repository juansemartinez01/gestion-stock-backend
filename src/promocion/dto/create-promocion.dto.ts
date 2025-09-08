import { IsString, IsNotEmpty, IsNumber, IsArray, ValidateNested, ValidateIf, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

class ProductoInPromocionDto {
  @IsNumber()
  productoId: number;

  @ValidateIf(o => o.cantidad_gramos == null)
  @IsOptional()
  @IsInt()
  @Min(1)
  cantidad?: number;

  @ValidateIf(o => o.cantidad == null)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  cantidad_gramos?: number;
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
