import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';

import { AppModule } from './app.module';

/**
 * The one description of the wire.
 *
 * Built from the controllers' own decorators, which means it cannot describe a
 * route that does not exist and cannot miss one that does. Everything
 * downstream — the generated client, the gate that checks it is current — is
 * derived from what this returns.
 */
export function describe(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Keys')
    .setDescription(
      'Renting in Nigeria without paying a stranger for a flat that was already let.',
    )
    .setVersion('0.1.0')
    .addApiKey(
      { type: 'apiKey', name: 'x-reviewer-token', in: 'header' },
      'reviewer',
    )
    .build();
  return SwaggerModule.createDocument(app, config);
}

export async function emit(): Promise<unknown> {
  // `logger: false` because this runs in a gate, and a gate that prints Nest's
  // startup banner into a diff is a gate whose output nobody reads.
  const app = await NestFactory.create(AppModule, { logger: false });
  await app.init();
  const document = describe(app);
  await app.close();
  return document;
}
