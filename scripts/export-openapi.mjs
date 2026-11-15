import 'reflect-metadata';
import { writeFile, readFile } from 'node:fs/promises';
import { Test } from '@nestjs/testing';
import { AppModule } from '../dist/app.module.js';
import { DatabaseService } from '../dist/database/database.service.js';
import { createApiDocument } from '../dist/configure-app.js';

// Uses real controllers and configuration validation, without database lifecycle.
// This exports contracts; it does not prove database-backed route behavior.
const module = await Test.createTestingModule({ imports: [AppModule] })
  .overrideProvider(DatabaseService)
  .useValue({})
  .compile();
const app = module.createNestApplication({ logger: false });
try {
  await app.init();
  const content = JSON.stringify(createApiDocument(app), null, 2) + '\n';
  const target = new URL('../openapi.json', import.meta.url);
  if (process.argv.includes('--check')) {
    if ((await readFile(target, 'utf8')) !== content)
      throw new Error('OpenAPI snapshot is stale. Run pnpm api:export.');
  } else {
    await writeFile(target, content);
  }
  console.log(
    'OpenAPI contract ' +
      (process.argv.includes('--check') ? 'verified.' : 'exported.'),
  );
} finally {
  await app.close();
}
