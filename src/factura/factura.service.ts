import {
  Injectable, NotFoundException, BadRequestException, InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Factura } from './factura.entity';
import { FacturaVentaItem } from './factura-venta-item.entity';
import { VentaItem } from '../venta/venta-item.entity';
import { CreateFacturaDto } from './dto/create-factura.dto';
import { Usuario } from '../usuario/usuario.entity';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class FacturaService {
  constructor(
    @InjectRepository(Factura)
    private facturaRepo: Repository<Factura>,

    @InjectRepository(FacturaVentaItem)
    private facturaItemRepo: Repository<FacturaVentaItem>,

    @InjectRepository(VentaItem)
    private ventaItemRepo: Repository<VentaItem>,

    @InjectRepository(Usuario)
    private usuarioRepo: Repository<Usuario>,

    private dataSource: DataSource,
    private httpService: HttpService,
  ) {}

  async create(dto: CreateFacturaDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const usuario = await this.usuarioRepo.findOneBy({ id: dto.usuario_id });
      if (!usuario) throw new NotFoundException('Usuario no encontrado');

      let total = 0;
      const items: FacturaVentaItem[] = [];

      for (const itemDto of dto.items) {
        const ventaItem = await this.ventaItemRepo.findOne({
          where: { id: itemDto.venta_item_id },
        });

        if (!ventaItem) {
          throw new NotFoundException(`Ítem de venta ${itemDto.venta_item_id} no encontrado`);
        }

        if (itemDto.cantidad > ventaItem.cantidad) {
          throw new BadRequestException(`Cantidad solicitada (${itemDto.cantidad}) mayor a la vendida (${ventaItem.cantidad})`);
        }

        const subtotal = Number(itemDto.subtotal.toFixed(2));
        total += subtotal;

        const facturaItem = this.facturaItemRepo.create({
          ventaItem,
          cantidad: itemDto.cantidad,
          subtotal,
        });
        items.push(facturaItem);
      }

      const factura = this.facturaRepo.create({
        cuit_emisor: dto.cuit_emisor,
        importe_total: total,
        punto_venta: dto.punto_venta,
        factura_tipo: dto.factura_tipo,
        metodo_pago: dto.metodo_pago,
        test: dto.test,
        usuario,
        items,
      });

      await queryRunner.manager.save(Factura, factura);

      const response = await this.enviarAFacturadorARCA({
        cuit_emisor: dto.cuit_emisor,
        importe_total: total,
        punto_venta: dto.punto_venta,
        factura_tipo: dto.factura_tipo,
        metodo_pago: dto.metodo_pago,
        test: dto.test,
      });

      if (!response?.cae) {
        throw new InternalServerErrorException('La API de ARCA no devolvió un CAE válido');
      }

      factura.cae = response.cae;
      factura.vencimiento_cae = new Date(response.vencimiento_cae);

      await queryRunner.manager.save(Factura, factura);
      await queryRunner.commitTransaction();

      return factura;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  private async enviarAFacturadorARCA(payload: {
    cuit_emisor: number;
    importe_total: number;
    punto_venta: number;
    factura_tipo: number;
    metodo_pago: number;
    test: boolean;
  }) {
    try {
      const response = await firstValueFrom(
        this.httpService.post('https://facturador-production.up.railway.app/facturas', payload),
      );
      return response.data;
    } catch (error) {
      throw new InternalServerErrorException('Error al conectar con la API de ARCA');
    }
  }
}
