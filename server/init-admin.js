import bcrypt from 'bcryptjs'
import { getDbPool } from './src/config/db.js'
import './src/config/env.js'

async function initAdmin() {
  const pool = getDbPool()
  const username = process.env.ADMIN_USER || 'admin'
  const password = process.env.ADMIN_PASS || 'admin123'

  try {
    const hash = bcrypt.hashSync(password, 10)

    await pool.query(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE password_hash = ?',
      [username, hash, 'admin', hash],
    )

    // eslint-disable-next-line no-console
    console.log('✅ 管理员账号已创建/更新')
    // eslint-disable-next-line no-console
    console.log(`用户名: ${username}`)
    // eslint-disable-next-line no-console
    console.log(`密码: ${password}`)
    // eslint-disable-next-line no-console
    console.log('\n⚠️  请在生产环境中修改默认密码！')
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('❌ 初始化失败:', error.message)
    process.exit(1)
  } finally {
    await pool.end()
    process.exit(0)
  }
}

initAdmin()
