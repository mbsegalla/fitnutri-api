import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import type { Environment } from './config/environment.js';
import { setupSwagger } from './infrastructure/http/swagger/swagger.setup.js';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableShutdownHooks();

  const config = app.get(ConfigService<Environment, true>);

  if (config.get('SWAGGER_ENABLED', { infer: true })) {
    setupSwagger(app);
  }

  await app.listen(config.get('PORT', { infer: true }));
}

await bootstrap();
