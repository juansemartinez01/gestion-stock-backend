import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriaModule } from './categoria/categoria.module';
import { ProveedorModule } from './proveedor/proveedor.module';
import { AlmacenModule } from './almacen/almacen.module';
import { ProductoModule } from './producto/producto.module';
import { StockActualModule } from './stock-actual/stock-actual.module';
import { MovimientoStockModule } from './movimiento-stock/movimiento-stock.module';
import { ParametroReordenModule } from './parametro-reorden/parametro-reorden.module';
import { UnidadModule } from './unidad/unidad.module';
import { VentaModule } from './venta/venta.module';
import { AuthModule } from './auth/auth.module';
import { UsuarioModule } from './usuario/usuario.module';
import { RoleModule } from './role/role.module';
import { UsuarioRolModule } from './usuario-rol/usuario-rol.module';
import { Or } from 'typeorm';
import { OrdenCompra } from './orden-compra/orden-compra.entity';
import { OrdenCompraModule } from './orden-compra/orden-compra.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: +(process.env.DB_PORT || 5432),
      username: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      autoLoadEntities: true,
      synchronize: true,      // en dev true, en prod false
      migrations: ['dist/migrations/*.js'],
      // Removed 'cli' property as it is not valid
    }),
    CategoriaModule,
    ProveedorModule,
    AlmacenModule,
    ProductoModule,
    StockActualModule,
    MovimientoStockModule,
    ParametroReordenModule,
    UnidadModule,
    VentaModule,
    AuthModule,
    UsuarioModule,
    RoleModule,
    UsuarioRolModule,
    OrdenCompraModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
