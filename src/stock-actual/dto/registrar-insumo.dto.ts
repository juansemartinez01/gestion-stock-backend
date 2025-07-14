// src/stock-actual/dto/registrar-insumo.dto.ts
import { IsInt, Min } from 'class-validator';

export class RegistrarInsumoDto {
  @IsInt()
  producto_id: number;

  @IsInt()
  almacen_id: number;

  @IsInt()
  @Min(1)
  cantidad: number;
}
