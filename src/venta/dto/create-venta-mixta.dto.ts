// src/venta/dto/create-venta-mixta.dto.ts
import { IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateVentaItemDto } from './create-venta-item.dto';
import { CreateVentaPromoDto } from './create-venta-promo.dto';

export class CreateVentaMixtaDto {
  @IsNumber()
  usuarioId: number;

  @IsNumber()
  almacenId: number;

  @IsNumber()
  montoEfectivo: number;

  @IsNumber()
  montoBancarizado: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVentaItemDto)
  items: CreateVentaItemDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVentaPromoDto)
  promociones?: CreateVentaPromoDto[];
}
