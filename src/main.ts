import * as crypto from 'crypto';
if (!globalThis.crypto) {
  (globalThis as any).crypto = crypto;
}
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { Reflector }    from '@nestjs/core';

import 'reflect-metadata';



async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  
  app.enableCors({
    origin: ['http://localhost:3001','http://localhost:3000','http://frontend-jagger-production.up.railway.app'], // o true para permitir todos los orígenes (no recomendado en producción)
    credentials: true, // si usas cookies o autenticación con tokens en headers
  });
  const reflector = app.get(Reflector);
  // <— Aquí aplicamos el guard de JWT a todo, pero respetando @Public()

  
  app.useGlobalGuards(new JwtAuthGuard(reflector));
  //app.use(cookieParser());
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

// Fuerza build completo con todos los módulos
