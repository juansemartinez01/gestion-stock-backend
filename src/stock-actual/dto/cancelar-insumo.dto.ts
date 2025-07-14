// src/stock-actual/dto/cancelar-insumo.dto.ts
import { IsInt } from 'class-validator';

export class CancelarInsumoDto {
  @IsInt()
  movimiento_id: number;
}
