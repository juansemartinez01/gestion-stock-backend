export class CreatePromocionDto {
  codigo: string;
  precioPromo: number;
  productos: { productoId: number; cantidad: number }[];
}
