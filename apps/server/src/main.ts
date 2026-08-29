import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';

/*
  CORS is an allow-list by name, and never a wildcard.

  Learned on the previous project the expensive way: there was no CORS policy
  at all until a browser client existed, because a phone sends no preflight.
  Keys has a web surface from day one, so the policy exists from the first
  commit. An empty list means no browser may call this, which is the correct
  posture for a deployment that has not thought about it.
*/
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const origins = (process.env.KEYS_CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  if (origins.includes('*')) {
    throw new Error('KEYS_CORS_ORIGINS may not contain "*". Name the origins.');
  }

  app.enableCors({
    origin: origins,
    allowedHeaders: ['authorization', 'content-type'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  });

  SwaggerModule.setup(
    'swagger',
    app,
    SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Keys API')
        .setDescription(
          'Verified rental listings and tenancy management for Nigerian cities. ' +
            'Keys verifies authority to let, not title or ownership, and handles no money.',
        )
        .setVersion('0.0.1')
        .build(),
    ),
  );

  await app.listen(Number(process.env.PORT ?? 5211), '127.0.0.1');
}

void bootstrap();
