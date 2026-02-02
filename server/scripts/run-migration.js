#!/usr/bin/env node
/**
 * 执行 SQL 迁移：001_add_photo_urls_and_app_settings
 * 从 server 目录运行：node scripts/run-migration.js
 */

import { readFileSync, readdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import dotenv from 'dotenv'
import mysql from 'mysql2/promise'

const __dirname = dirname(fileURLToPath(import.meta.url))

// 从 server 目录加载 .env
dotenv.config({ path: join(__dirname, '..', '.env') })

const db = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'pic4pick',
}

const migrationsDir = join(__dirname, '..', 'sql', 'migrations')
const migrationFiles = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort()

async function run() {
  console.log('Pic4Pick 迁移')
  console.log('数据库:', db.database, '@', db.host)
  let conn
  try {
    conn = await mysql.createConnection(db)
    for (const file of migrationFiles) {
      const sql = readFileSync(join(migrationsDir, file), 'utf8')
      const statements = sql
        .split(';')
        .map((s) => s.replace(/--[\s\S]*?(?=\n|$)/g, '').trim())
        .filter((s) => s.length > 0)
      console.log('---', file)
      for (const stmt of statements) {
        if (!stmt) continue
        try {
          await conn.execute(stmt)
          console.log('  ✓ 执行成功')
        } catch (err) {
          if (err.code === 'ER_DUP_FIELDNAME' || err.message?.includes('Duplicate column name')) {
            console.log('  ⊘ 列已存在，跳过:', err.sqlMessage || err.message)
          } else if (err.code === 'ER_DUP_KEYNAME' || err.message?.includes('Duplicate key name')) {
            console.log('  ⊘ 索引已存在，跳过:', err.sqlMessage || err.message)
          } else if (err.message?.toLowerCase().includes('duplicate key')) {
            console.log('  ⊘ 约束已存在，跳过:', err.sqlMessage || err.message)
          } else if (err.code === 'ER_TABLE_EXISTS_ERROR' || err.message?.includes('already exists')) {
            console.log('  ⊘ 表已存在，跳过')
          } else {
            throw err
          }
        }
      }
    }
    console.log('迁移完成。')
  } catch (err) {
    console.error('迁移失败:', err.message)
    process.exit(1)
  } finally {
    if (conn) await conn.end()
  }
}

run()
