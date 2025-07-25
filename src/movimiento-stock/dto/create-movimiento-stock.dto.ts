import { IsInt, Min, IsIn, IsOptional, IsString, MaxLength, IsNumber } from 'class-validator';

export class CreateMovimientoStockDto {
  @IsInt()
  producto_id: number;

  @IsInt()
  @IsOptional()
  origen_almacen?: number;

  @IsInt()
  @IsOptional()
  destino_almacen?: number;

  @IsInt()
  @Min(1)
  cantidad: number;

  @IsIn(['entrada', 'salida', 'traspaso', 'insumo'])
  tipo: 'entrada' | 'salida' | 'traspaso' | 'insumo';

  @IsInt()
  @IsOptional()
  usuario_id?: number;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  motivo?: string;

  @IsInt()
  @IsOptional()
  proveedor_id?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  precioUnitario?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  precioTotal?: number;
}