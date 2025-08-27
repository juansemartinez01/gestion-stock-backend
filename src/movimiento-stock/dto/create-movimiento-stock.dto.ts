import { Type } from 'class-transformer';
import {
  IsInt, Min, IsIn, IsOptional, IsString, MaxLength,
  IsNumber, ValidateIf, registerDecorator, ValidationArguments, ValidationOptions
} from 'class-validator';

/** ===== Helper: exactamente uno de dos campos (XOR) =====
 *  Usar sobre una propiedad (ej: `tipo`) para validar que exista
 *  exactamente uno entre aKey y bKey en el objeto.
 */
function ExactlyOneOf(aKey: string, bKey: string, options?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'ExactlyOneOf',
      target: object.constructor,
      propertyName,
      constraints: [aKey, bKey],
      options,
      validator: {
        validate(_: any, args: ValidationArguments) {
          const [a, b] = args.constraints as [string, string];
          const o: any = args.object;
          const hasA = o[a] !== undefined;
          const hasB = o[b] !== undefined;
          return (hasA || hasB) && !(hasA && hasB);
        },
        defaultMessage(args: ValidationArguments) {
          const [a, b] = args.constraints as [string, string];
          return `Debe enviar exactamente uno: "${a}" (piezas) o "${b}" (gramos).`;
        },
      },
    });
  };
}

/** ===== Helper: NotEqual(currentProp, otherProp) =====
 *  Usar sobre la propiedad que querés comparar (ej: destino_almacen)
 *  para validar que sea distinta de otra (ej: origen_almacen).
 */
function NotEqual(otherKey: string, options?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'NotEqual',
      target: object.constructor,
      propertyName,
      constraints: [otherKey],
      options,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [other] = args.constraints as [string];
          const o: any = args.object;
          if (value === undefined || o[other] === undefined) return true; // otra validación exigirá presencia
          return value !== o[other];
        },
        defaultMessage(args: ValidationArguments) {
          const [other] = args.constraints as [string];
          return `"${args.property}" debe ser distinto de "${other}".`;
        },
      },
    });
  };
}

export class CreateMovimientoStockDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  producto_id: number;

  // Reglas por tipo → origen requerido en: salida, traspaso, insumo
  @ValidateIf(o => ['salida', 'traspaso', 'insumo'].includes(o.tipo))
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  origen_almacen?: number;

  // Reglas por tipo → destino requerido en: entrada, traspaso
  @ValidateIf(o => ['entrada', 'traspaso'].includes(o.tipo))
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  @ValidateIf(o => o.tipo === 'traspaso') // si es traspaso, además deben ser distintos
  @NotEqual('origen_almacen', {
    message: '"destino_almacen" debe ser distinto de "origen_almacen" en un traspaso.',
  })
  destino_almacen?: number;

  // Solo piezas (entero, >0)
  @ValidateIf(o => o.cantidad_gramos === undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  cantidad?: number;

  // Solo gramos (hasta 3 decimales, >0)
  @ValidateIf(o => o.cantidad === undefined)
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  @IsOptional()
  cantidad_gramos?: number;

  @IsIn(['entrada', 'salida', 'traspaso', 'insumo'])
  // XOR piezas/gramos: lo colgamos acá para que el mensaje sea "global"
  @ExactlyOneOf('cantidad', 'cantidad_gramos')
  tipo: 'entrada' | 'salida' | 'traspaso' | 'insumo';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  usuario_id?: number;

  @IsString()
  @IsOptional()
  @MaxLength(500)
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
