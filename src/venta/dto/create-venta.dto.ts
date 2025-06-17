import { IsInt, IsArray, ValidateNested, IsNumber, IsString, IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateVentaItemDto } from './create-venta-item.dto';
import { CreateVentaPromoDto } from './create-venta-promo.dto';

export class CreateVentaDto {
  @IsInt()
  usuarioId: number;

  @IsInt()
  almacenId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVentaItemDto)
  items: CreateVentaItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVentaPromoDto)
  promociones?: CreateVentaPromoDto[];

  @IsEnum(['EFECTIVO', 'BANCARIZADO'])
  tipoIngreso: 'EFECTIVO' | 'BANCARIZADO';

}