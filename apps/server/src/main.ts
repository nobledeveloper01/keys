import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { describe } from './openapi';

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
    // The review console is a browser app, so the header its guard reads has
    // to survive preflight. Omitting it makes the console fail in a way that
    // looks like an auth bug rather than a CORS one.
    allowedHeaders: ['authorization', 'content-type', 'x-reviewer-token'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  });

  // The same document the generated client is built from. Two descriptions
  // of one API is how the client goes stale while every file still compiles.
  SwaggerModule.setup('swagger', app, describe(app));

  await app.listen(Number(process.env.PORT ?? 5211), '127.0.0.1');
}

void bootstrap();
