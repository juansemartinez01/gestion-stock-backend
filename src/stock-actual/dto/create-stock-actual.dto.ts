import { Type } from 'class-transformer';
import {
  IsInt, IsNumber, IsOptional, IsString, Min, ValidateIf
} from 'class-validator';
import { ExactlyOneOf } from '../validators/exactly-one-of.decorator'; // o en el mismo archivo

export class CreateStockActualDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  producto_id: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  almacen_id: number;

  // Solo piezas
  // Solo piezas
  @ExactlyOneOf('cantidad', 'cantidad_gramos')
  @ValidateIf(o => o.cantidad_gramos === undefined)
  @Type(() => Number)
  @IsInt()
  @Min(0)
  cantidad?: number;

  // Solo gramos (hasta 3 decimales)
  @ValidateIf(o => o.cantidad === undefined)
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  cantidad_gramos?: number;

  
  @IsOptional()
  @IsString()
  motivo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  proveedor_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  precioUnitario?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  precioTotal?: number;
}
