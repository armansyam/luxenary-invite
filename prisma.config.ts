import { defineConfig } from 'prisma/config'

export default defineConfig({
  datasource: {
    url: 'file:./dev.db',
  },
  migrations: {
    seed: 'ts-node prisma/seed.ts',
  },
})