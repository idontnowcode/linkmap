import { app } from 'electron'
import { join } from 'path'
import { createClient, type Client } from '@libsql/client'
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql'
import * as schema from './schema'

let _db: LibSQLDatabase<typeof schema> | null = null
let _client: Client | null = null

/** 앱 시작 시 1회 호출. 테이블 생성을 보장하고 drizzle 인스턴스를 캐시한다. */
export async function initDb(): Promise<LibSQLDatabase<typeof schema>> {
  if (_db) return _db

  const dbPath = join(app.getPath('userData'), 'linkmap.db').replace(/\\/g, '/')
  _client = createClient({ url: `file:${dbPath}` })

  await _client.execute('PRAGMA foreign_keys = ON;')
  // 마이그레이션 파일 없이 첫 실행 시 테이블 보장
  await _client.executeMultiple(schema.CREATE_TABLES_SQL)
  // 경량 마이그레이션: 기존 DB에 신규 컬럼 추가 (이미 있으면 무시)
  for (const ddl of schema.MIGRATIONS) {
    try {
      await _client.execute(ddl)
    } catch {
      /* 이미 적용됨 (duplicate column 등) */
    }
  }

  _db = drizzle(_client, { schema })
  return _db
}

export function getDb(): LibSQLDatabase<typeof schema> {
  if (!_db) throw new Error('DB not initialized — call initDb() first')
  return _db
}

export { schema }
