import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters';

function validateEnv() {
  const logger = new Logger('EnvCheck');
  const required = ["DATABASE_URL", "JWT_SECRET", "JWT_REFRESH_SECRET"];

  for (const key of required) {
    const value = process.env[key];
    if (!value || value.trim() === "" || value === "CHANGE_ME" || value.startsWith("CHANGE_ME")) {
      logger.error(`Variable d'environnement manquante ou invalide : ${key}`);
      logger.error("Verifiez votre fichier .env avant de demarrer l'application.");
      process.exit(1);
    }
  }
  logger.log("Variables d'environnement OK");
}

async function bootstrap() {
  validateEnv();
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // ✅ IMPORTANT : Faire confiance au proxy (Nginx, Docker)
  // pour récupérer la vraie IP du client via X-Forwarded-For.
  // Indispensable pour le ThrottlerGuard.
  app.set('trust proxy', 1);

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 3000);
  const nodeEnv = config.get<string>('NODE_ENV', 'development');

  app.use(helmet());
  app.use(cookieParser());

  // ✅ CORS : On autorise explicitement les adresses locales et le réseau
  // pour éviter les blocages lors des tests sur mobile/tablette.
  const frontendUrl = config.get<string>('FRONTEND_URL', 'http://localhost:5173');
  const allowedOrigins = frontendUrl.split(',').map(url => url.trim());
  
  app.enableCors({
    origin: (origin, callback) => {
      // Autoriser les requêtes sans origine (Postman, curl)
      if (!origin) return callback(null, true);
      
      // Autoriser si l'origine est dans la liste, ou si c'est une IP locale (192.168.x.x, 10.x.x.x)
      if (allowedOrigins.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+):\d+$/.test(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('SIS-MALI API')
      .setDescription("API REST du Systeme d'Information Scolaire pour le Mali")
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', name: 'Authorization', in: 'header' },
        'access-token',
      )
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, { swaggerOptions: { persistAuthorization: true } });
    logger.log(`Swagger: http://localhost:${port}/api/docs`);
  }

  await app.listen(port, '0.0.0.0');
  logger.log(`SIS-MALI API running on http://0.0.0.0:${port}`);
}

bootstrap().catch((err) => {
  console.error('Bootstrap failed:', err);
  process.exit(1);
});