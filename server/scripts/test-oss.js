#!/usr/bin/env node
/**
 * 阿里云 OSS 连接测试
 * 使用方式：在 server 目录下执行 npm run test:oss 或 node scripts/test-oss.js
 * 配置来源：优先 .env（OSS_REGION, OSS_BUCKET, OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET），
 *         未设置时从后台配置（数据库）读取。
 */
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '..', '.env') })

async function main() {
  const { testOssConnection } = await import('../src/services/ossService.js')
  console.log('正在测试阿里云 OSS 连接...\n')

  try {
    const result = await testOssConnection()
    console.log('✓ OSS 连接成功')
    console.log('  Bucket:', result.bucket)
    console.log('  Region:', result.region || '(未返回)')
    console.log('')
    process.exit(0)
  } catch (err) {
    console.error('✗ OSS 测试失败:', err.message)
    if (err.code) console.error('  错误码:', err.code)
    if (err.status) console.error('  HTTP 状态:', err.status)
    console.log('\n请检查：')
    console.log('  1. server/.env 中是否配置 OSS_REGION, OSS_BUCKET, OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET')
    console.log('  2. 或在管理后台「配置」→「阿里云 OSS」中填写并保存')
    console.log('  3. AccessKey 是否有该 Bucket 的读权限（如 getBucketInfo）')
    process.exit(1)
  }
}

main()
