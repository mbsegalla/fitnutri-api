import { Test } from '@nestjs/testing';

import { AppModule } from './app.module.js';

describe('AppModule', () => {
  it('compiles the root module', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    try {
      expect(moduleRef.get(AppModule)).toBeInstanceOf(AppModule);
    } finally {
      await moduleRef.close();
    }
  });
});
