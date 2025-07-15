import { Type } from 'class-transformer';

export class BuscarProductoDto {
  nombre?: string;
  sku?: string;
  barcode?: string;

  @Type(() => Number)
  categoriaId?: number;

  @Type(() => Number)
  unidadId?: number;

  @Type(() => Boolean)
  conStock?: boolean;

  @Type(() => Number)
  almacenId?: number;
}
