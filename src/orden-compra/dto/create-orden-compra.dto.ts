// src/orden-compra/dto/create-orden-compra.dto.ts
import {
  IsInt,
  IsDateString,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateOrdenCompraItemDto } from './create-orden-compra-item.dto';

export class CreateOrdenCompraDto {
  @IsInt()
  proveedorId: number;

  @IsDateString()
  fecha: string;

  @ValidateNested({ each: true })
  @Type(() => CreateOrdenCompraItemDto)
  @ArrayMinSize(1)
  items: CreateOrdenCompraItemDto[];
}
