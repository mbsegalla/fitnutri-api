import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Fit Nutri API')
    .setDescription('HTTP API for the Fit Nutri platform.')
    .setVersion('0.0.1')
    .addBearerAuth()
    .addTag('Auth', 'Account registration, sign-in and authenticated identity.')
    .addTag('Health', 'Application liveness and database readiness.')
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('docs', app, documentFactory, {
    customSiteTitle: 'Fit Nutri API | Documentation',
    raw: ['json'],
  });
}
