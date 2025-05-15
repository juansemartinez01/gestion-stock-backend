import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1747320849857 implements MigrationInterface {
    name = 'InitSchema1747320849857'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "proveedor" ("id" SERIAL NOT NULL, "nombre" character varying(255) NOT NULL, "contacto" character varying(255), "telefono" character varying(50), "email" character varying(100), CONSTRAINT "PK_405f60886417ece76cb5681550a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "unidad" ("id" SERIAL NOT NULL, "nombre" character varying(50) NOT NULL, "abreviatura" character varying(20), CONSTRAINT "PK_3f087c90fe8ce6bafe8f8af6779" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "categoria" ("id" SERIAL NOT NULL, "nombre" character varying(100) NOT NULL, "descripcion" text, CONSTRAINT "UQ_6771d90221138c5bf48044fd73d" UNIQUE ("nombre"), CONSTRAINT "PK_f027836b77b84fb4c3a374dc70d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "producto" ("id" SERIAL NOT NULL, "sku" character varying(50) NOT NULL, "nombre" character varying(255) NOT NULL, "descripcion" text, "unidad_id" integer NOT NULL, "categoria_id" integer, "proveedor_id" integer, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "barcode" character varying(100), "precioBase" numeric(12,2) NOT NULL DEFAULT '0', CONSTRAINT "UQ_eb70b0b1c60ed7e2bfaacc060fa" UNIQUE ("sku"), CONSTRAINT "UQ_3c5101ec12b5234d77ea71853c3" UNIQUE ("barcode"), CONSTRAINT "PK_5be023b11909fe103e24c740c7d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "venta_item" ("id" SERIAL NOT NULL, "cantidad" integer NOT NULL, "precioUnitario" numeric(12,2) NOT NULL, "subtotal" numeric(12,2) NOT NULL, "venta_id" integer, "producto_id" integer, CONSTRAINT "PK_789dbe96f074ed37f0bfa4de483" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "venta" ("id" SERIAL NOT NULL, "fecha" TIMESTAMP NOT NULL DEFAULT now(), "total" numeric(12,2) NOT NULL, "estado" character varying(20) NOT NULL DEFAULT 'PENDIENTE', "usuario" character varying(255) NOT NULL DEFAULT 'Admin', CONSTRAINT "PK_8bb53d01fe72521d5cfb1f149d4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "parametros_reorden" ("id" SERIAL NOT NULL, "producto_id" integer NOT NULL, "nivel_minimo" integer NOT NULL, "nivel_optimo" integer NOT NULL, CONSTRAINT "UQ_fe3e8c59c851c815877859ea5aa" UNIQUE ("producto_id"), CONSTRAINT "PK_b99cfb88ba02eb1a5a6c1b03909" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "almacen" ("id" SERIAL NOT NULL, "nombre" character varying(100) NOT NULL, "ubicacion" character varying(255), "capacidad" integer, CONSTRAINT "PK_78a1ec4675cb911ff041d485b3b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "stock_actual" ("producto_id" integer NOT NULL, "almacen_id" integer NOT NULL, "cantidad" integer NOT NULL, "last_updated" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8993348ce0c91423595da771848" PRIMARY KEY ("producto_id", "almacen_id"))`);
        await queryRunner.query(`CREATE TABLE "movimiento_stock" ("id" SERIAL NOT NULL, "producto_id" integer NOT NULL, "origen_almacen" integer, "destino_almacen" integer, "cantidad" integer NOT NULL, "tipo" character varying(20) NOT NULL, "fecha" TIMESTAMP NOT NULL DEFAULT now(), "usuario_id" integer, "motivo" text, CONSTRAINT "PK_ec7f6fe6c53203485a1591921d1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "producto" ADD CONSTRAINT "FK_c3ef80e6d1049faa1c6d3130acc" FOREIGN KEY ("unidad_id") REFERENCES "unidad"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "producto" ADD CONSTRAINT "FK_1ae19a0cb542cf735d454bab0b5" FOREIGN KEY ("categoria_id") REFERENCES "categoria"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "producto" ADD CONSTRAINT "FK_9d7eb17b15ec2971a26f48a8329" FOREIGN KEY ("proveedor_id") REFERENCES "proveedor"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "venta_item" ADD CONSTRAINT "FK_a274f515c1475bb6111e8ed4789" FOREIGN KEY ("venta_id") REFERENCES "venta"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "venta_item" ADD CONSTRAINT "FK_2cb0d9adab90c2ef6f6db573d0c" FOREIGN KEY ("producto_id") REFERENCES "producto"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "parametros_reorden" ADD CONSTRAINT "FK_fe3e8c59c851c815877859ea5aa" FOREIGN KEY ("producto_id") REFERENCES "producto"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "stock_actual" ADD CONSTRAINT "FK_00d0507fe3b92776f2318cdb09a" FOREIGN KEY ("producto_id") REFERENCES "producto"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "stock_actual" ADD CONSTRAINT "FK_61c22430e92f7cadf0f909b762a" FOREIGN KEY ("almacen_id") REFERENCES "almacen"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "movimiento_stock" ADD CONSTRAINT "FK_710f568fa31814d122557802f62" FOREIGN KEY ("producto_id") REFERENCES "producto"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "movimiento_stock" ADD CONSTRAINT "FK_a00bb22afdc6ff542a10f9ef358" FOREIGN KEY ("origen_almacen") REFERENCES "almacen"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "movimiento_stock" ADD CONSTRAINT "FK_c5d5b442c236d6d868e037ac17c" FOREIGN KEY ("destino_almacen") REFERENCES "almacen"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "movimiento_stock" DROP CONSTRAINT "FK_c5d5b442c236d6d868e037ac17c"`);
        await queryRunner.query(`ALTER TABLE "movimiento_stock" DROP CONSTRAINT "FK_a00bb22afdc6ff542a10f9ef358"`);
        await queryRunner.query(`ALTER TABLE "movimiento_stock" DROP CONSTRAINT "FK_710f568fa31814d122557802f62"`);
        await queryRunner.query(`ALTER TABLE "stock_actual" DROP CONSTRAINT "FK_61c22430e92f7cadf0f909b762a"`);
        await queryRunner.query(`ALTER TABLE "stock_actual" DROP CONSTRAINT "FK_00d0507fe3b92776f2318cdb09a"`);
        await queryRunner.query(`ALTER TABLE "parametros_reorden" DROP CONSTRAINT "FK_fe3e8c59c851c815877859ea5aa"`);
        await queryRunner.query(`ALTER TABLE "venta_item" DROP CONSTRAINT "FK_2cb0d9adab90c2ef6f6db573d0c"`);
        await queryRunner.query(`ALTER TABLE "venta_item" DROP CONSTRAINT "FK_a274f515c1475bb6111e8ed4789"`);
        await queryRunner.query(`ALTER TABLE "producto" DROP CONSTRAINT "FK_9d7eb17b15ec2971a26f48a8329"`);
        await queryRunner.query(`ALTER TABLE "producto" DROP CONSTRAINT "FK_1ae19a0cb542cf735d454bab0b5"`);
        await queryRunner.query(`ALTER TABLE "producto" DROP CONSTRAINT "FK_c3ef80e6d1049faa1c6d3130acc"`);
        await queryRunner.query(`DROP TABLE "movimiento_stock"`);
        await queryRunner.query(`DROP TABLE "stock_actual"`);
        await queryRunner.query(`DROP TABLE "almacen"`);
        await queryRunner.query(`DROP TABLE "parametros_reorden"`);
        await queryRunner.query(`DROP TABLE "venta"`);
        await queryRunner.query(`DROP TABLE "venta_item"`);
        await queryRunner.query(`DROP TABLE "producto"`);
        await queryRunner.query(`DROP TABLE "categoria"`);
        await queryRunner.query(`DROP TABLE "unidad"`);
        await queryRunner.query(`DROP TABLE "proveedor"`);
    }

}
