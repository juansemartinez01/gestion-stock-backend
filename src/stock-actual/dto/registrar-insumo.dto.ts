// src/stock-actual/dto/registrar-insumo.dto.ts
import { IsInt, IsNumber, Min, ValidateIf } from 'class-validator';
import { ExactlyOneOf } from '../validators/exactly-one-of.decorator';
import { Type } from 'class-transformer';

export class RegistrarInsumoDto {
  @IsInt()
  producto_id: number;

  @IsInt()
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
}
