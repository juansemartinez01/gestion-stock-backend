import { IsInt, IsArray, ValidateNested, IsNumber, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateVentaItemDto } from './create-venta-item.dto';

export class CreateVentaDto {
  @IsInt()
  usuarioId: number;

  @IsInt()
  almacenId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVentaItemDto)
  items: CreateVentaItemDto[];
}