import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT || 4000;

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('GridSense API')
    .setDescription(
      'GridSense IoT API: users, roles, rooms (devices), sensors, switches and charts.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addSecurityRequirements('bearer')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  // CORS: comma-separated origins, or every origin when unset (development).
  const origins = process.env.CORS_ORIGINS?.split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({ origin: origins?.length ? origins : true });

  app.enableShutdownHooks();

  await app.listen(port);
  console.log(`GridSense API listening on :${port} (docs at /docs)`);
}
bootstrap();
