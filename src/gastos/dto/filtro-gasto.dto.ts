import { Transform } from 'class-transformer';
import { IsBooleanString, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsPositive, IsString, Max, Min } from 'class-validator';

export class FiltroGastoDto {
  // Fechas (opcionales, inclusivas)
  @IsOptional()
  @IsDateString({}, { message: 'desde debe ser YYYY-MM-DD' })
  desde?: string;

  @IsOptional()
  @IsDateString({}, { message: 'hasta debe ser YYYY-MM-DD' })
  hasta?: string;

  // Búsqueda en descripción/notas
  @IsOptional()
  @IsString()
  search?: string;

  // Filtros de monto
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : value))
  @IsNumber()
  @IsPositive()
  minMonto?: number;

  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : value))
  @IsNumber()
  @IsPositive()
  maxMonto?: number;

  // Paginado
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  // Orden
  @IsOptional()
  @IsIn(['fecha', 'monto', 'createdAt'])
  orderBy?: 'fecha' | 'monto' | 'createdAt' = 'fecha';

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  order?: 'ASC' | 'DESC' = 'DESC';

  // Incluir soft-deleted (opcional, por defecto NO)
  @IsOptional()
  @IsBooleanString()
  incluirEliminados?: string;
}
