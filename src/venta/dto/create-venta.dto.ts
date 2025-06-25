import { IsInt, IsArray, ValidateNested, IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateVentaItemDto } from './create-venta-item.dto';
import { CreateVentaPromoDto } from './create-venta-promo.dto';
import { TipoIngreso } from '../../enum/ingreso-tipo.enum';

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

  @IsEnum(TipoIngreso, { message: 'tipoIngreso debe ser EFECTIVO o BANCARIZADO' })
  tipoIngreso: TipoIngreso;
}
