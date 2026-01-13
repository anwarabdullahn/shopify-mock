import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  const port = process.env.PORT || 3100;

  app.enableCors();

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('Shopify Mock API')
    .setDescription('Local Shopify GraphQL API mock service for development and testing')
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'X-Shopify-Access-Token header (GraphQL)',
      },
      'access-token',
    )
    .addTag('GraphQL', 'Shopify GraphQL API endpoint')
    .addTag('Admin', 'Admin REST endpoints for management')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(port, () => {
    logger.log(`Shopify Mock Service running on http://localhost:${port}`);
    logger.log(`📚 Swagger Docs: http://localhost:${port}/docs`);
    logger.log(`🔌 GraphQL endpoint: http://localhost:${port}/graphql.json`);
    logger.log(`⚙️  Admin endpoints: http://localhost:${port}/admin`);
  });
}

bootstrap().catch((err) => {
  console.error('Bootstrap error:', err);
  process.exit(1);
});
