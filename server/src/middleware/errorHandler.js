export default function errorHandler(err, req, res, next) {
  // eslint-disable-next-line no-console
  console.error('[Error]', err.message || err)
  if (err.code) console.error('[Error] code:', err.code)
  if (err.sqlMessage) console.error('[Error] sqlMessage:', err.sqlMessage)
  if (err.sql) console.error('[Error] sql:', err.sql)
  if (err.stack) {
    // eslint-disable-next-line no-console
    console.error(err.stack)
  }

  if (res.headersSent) {
    return next(err)
  }

  const status = err.status || 500
  let message = err.message || 'Internal server error'
  if (status === 500) {
    if (err.code === 'ER_NO_SUCH_TABLE') {
      message = '数据库表缺失，请在 server 目录执行：npm run migrate'
    } else if (err.code === 'ER_BAD_FIELD_ERROR') {
      message = '数据库结构需要更新，请在 server 目录执行：npm run migrate'
    } else if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
      message = '数据库连接失败，请检查 DB 配置与 MySQL 是否启动'
    } else if (err.code === 'ER_ACCESS_DENIED_ERROR' || err.code === 'ER_DBACCESS_DENIED_ERROR') {
      message = '数据库访问被拒绝，请检查 server/.env 中的 DB 用户名和密码'
    } else if (err.code === 'ER_BAD_DB_ERROR') {
      message = '数据库不存在，请先创建数据库或检查 server/.env 中的 DB_NAME'
    } else if (message === 'Internal server error' && err.code) {
      message = `服务器错误 (${err.code})，请查看后端终端日志`
    } else if (message === 'Internal server error') {
      message = '服务器错误，请查看后端终端日志'
    }
  }

  res.status(status).json({
    message,
  })
}

