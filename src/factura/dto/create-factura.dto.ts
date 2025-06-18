import {
  IsBoolean, IsInt, IsNumber, ValidateNested, IsArray, Min, Max, IsOptional
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateFacturaItemDto {
  @IsInt()
  venta_item_id: number;

  @IsInt()
  @Min(1)
  cantidad: number;

  @IsNumber()
  @Min(0)
  subtotal: number;
}

export class CreateFacturaDto {
  @IsInt()
  cuit_emisor: number;

  @IsInt()
  punto_venta: number;

  @IsInt()
  factura_tipo: number;

  @IsInt()
  metodo_pago: number;

  @IsBoolean()
  test: boolean;

  @IsInt()
  usuario_id: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFacturaItemDto)
  items: CreateFacturaItemDto[];
}
