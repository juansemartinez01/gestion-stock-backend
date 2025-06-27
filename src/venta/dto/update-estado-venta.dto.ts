// src/venta/dto/update-estado-venta.dto.ts
import { IsString } from 'class-validator';

export class UpdateEstadoVentaDto {
  @IsString()
  estado: string;
}
