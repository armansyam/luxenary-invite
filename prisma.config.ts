import { defineConfig } from 'prisma/config';

export default defineConfig({
  datasources: {
    db: {
      provider: 'sqlite',
      url: 'file:./dev.db',
    },
  },
});