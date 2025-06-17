import { IsEnum, IsNumber, IsPositive, IsInt } from 'class-validator';

export class CreateIngresoVentaDto {
  @IsInt()
  ventaId: number;

  @IsEnum(['EFECTIVO', 'BANCARIZADO'])
  tipo: 'EFECTIVO' | 'BANCARIZADO';

  @IsNumber()
  @IsPositive()
  monto: number;
}
