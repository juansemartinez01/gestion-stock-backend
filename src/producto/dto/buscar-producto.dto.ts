// src/producto/dto/buscar-producto.dto.ts
export class BuscarProductoDto {
  nombre?: string;
  sku?: string;
  barcode?: string;
  categoriaId?: number;
  unidadId?: number;
  conStock?: boolean;
  almacenId?: number;
}
