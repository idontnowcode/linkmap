import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/main/db/schema.ts',
  out: './src/main/db/migrations',
  // 실제 DB는 런타임에 app userData 경로에 생성됨. 이 경로는 drizzle-kit generate 용.
  dbCredentials: { url: 'file:./local.db' }
})
