import { getDbPool } from '../config/db.js'

const CATEGORY_FIELDS = 'id, name, sort_order, filter_type, filter_tags, is_system, created_at, updated_at, deleted_at'

/**
 * 获取所有分类，按 sort_order 排序（不含已软删除）
 */
export async function listCategories() {
  const pool = getDbPool()
  const [rows] = await pool.query(
    `SELECT ${CATEGORY_FIELDS} FROM categories WHERE (deleted_at IS NULL) ORDER BY sort_order ASC, id ASC`
  )
  return rows
}

/**
 * 根据 ID 获取单个分类（默认不含已删除）
 */
export async function getCategoryById(id, opts = {}) {
  const pool = getDbPool()
  const includeDeleted = opts.includeDeleted === true
  const whereDeleted = includeDeleted ? '' : ' AND (deleted_at IS NULL)'
  const [rows] = await pool.query(
    `SELECT ${CATEGORY_FIELDS} FROM categories WHERE id = ?${whereDeleted}`,
    [id]
  )
  return rows[0] || null
}

/**
 * 根据名称获取分类（仅未删除）
 */
export async function getCategoryByName(name) {
  const pool = getDbPool()
  const [rows] = await pool.query(
    `SELECT ${CATEGORY_FIELDS} FROM categories WHERE name = ? AND (deleted_at IS NULL)`,
    [name]
  )
  return rows[0] || null
}

/**
 * 创建分类
 */
export async function createCategory(data) {
  const { name, sort_order, filter_type = 'manual', filter_tags = null } = data

  if (!name || !name.trim()) {
    throw new Error('分类名称不能为空')
  }

  // 检查名称是否已存在
  const existing = await getCategoryByName(name.trim())
  if (existing) {
    throw new Error('分类名称已存在')
  }

  // 如果没有指定排序，取最大值 + 1
  const pool = getDbPool()
  let finalSortOrder = sort_order
  if (finalSortOrder == null) {
    const [maxRows] = await pool.query('SELECT MAX(sort_order) as maxOrder FROM categories WHERE deleted_at IS NULL')
    finalSortOrder = (maxRows[0]?.maxOrder || 0) + 1
  }

  const [result] = await pool.query(
    'INSERT INTO categories (name, sort_order, filter_type, filter_tags, is_system) VALUES (?, ?, ?, ?, 0)',
    [name.trim(), finalSortOrder, filter_type, filter_tags]
  )

  return getCategoryById(result.insertId)
}

/**
 * 更新分类
 */
export async function updateCategory(id, data) {
  const category = await getCategoryById(id)
  if (!category) {
    throw new Error('分类不存在')
  }

  const updates = []
  const params = []

  if (data.name !== undefined) {
    const trimmedName = data.name.trim()
    if (!trimmedName) {
      throw new Error('分类名称不能为空')
    }
    // 检查名称是否与其他分类冲突
    const existing = await getCategoryByName(trimmedName)
    if (existing && existing.id !== Number(id)) {
      throw new Error('分类名称已存在')
    }
    updates.push('name = ?')
    params.push(trimmedName)
  }

  if (data.sort_order !== undefined) {
    updates.push('sort_order = ?')
    params.push(data.sort_order)
  }

  if (data.filter_type !== undefined) {
    updates.push('filter_type = ?')
    params.push(data.filter_type)
  }

  if (data.filter_tags !== undefined) {
    updates.push('filter_tags = ?')
    params.push(data.filter_tags)
  }

  if (updates.length === 0) {
    return category
  }

  const pool = getDbPool()
  params.push(id)
  await pool.query(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`, params)

  return getCategoryById(id)
}

/**
 * 软删除分类（可复原）
 */
export async function deleteCategory(id) {
  const category = await getCategoryById(id)
  if (!category) {
    throw new Error('分类不存在')
  }

  if (category.is_system) {
    throw new Error('系统内置分类不可删除')
  }

  const pool = getDbPool()
  await pool.query('UPDATE categories SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?', [id])
  return { success: true, message: '分类已删除，可在下方「已删除的分类」中复原' }
}

/**
 * 获取已软删除的分类列表（管理员用）
 */
export async function listDeletedCategories() {
  const pool = getDbPool()
  const [rows] = await pool.query(
    `SELECT ${CATEGORY_FIELDS} FROM categories WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC`
  )
  return rows
}

/**
 * 复原已删除的分类
 */
export async function restoreCategory(id) {
  const pool = getDbPool()
  const [rows] = await pool.query(
    'SELECT id, name FROM categories WHERE id = ? AND deleted_at IS NOT NULL',
    [id]
  )
  if (!rows || rows.length === 0) {
    throw new Error('该分类不存在或未被删除，无法复原')
  }

  await pool.query('UPDATE categories SET deleted_at = NULL WHERE id = ?', [id])
  return getCategoryById(id)
}

/**
 * 永久删除已软删除的分类（不可恢复），并写入已删除分类归档表
 */
export async function permanentDeleteCategory(id) {
  const pool = getDbPool()
  const [rows] = await pool.query(
    `SELECT id, name, sort_order, filter_type, filter_tags, is_system, created_at, updated_at, deleted_at
     FROM categories WHERE id = ? AND deleted_at IS NOT NULL`,
    [id]
  )
  if (!rows || rows.length === 0) {
    throw new Error('该分类不存在或未被删除，无法永久删除')
  }

  const r = rows[0]
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    // 先写入归档表，再删除；任一失败则回滚
    await conn.query(
      `INSERT INTO deleted_categories_log
       (original_id, name, sort_order, filter_type, filter_tags, is_system, created_at, updated_at, soft_deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        r.id,
        String(r.name || '').trim() || '未命名',
        Number(r.sort_order) || 0,
        String(r.filter_type || 'manual').slice(0, 16),
        r.filter_tags ?? null,
        r.is_system === 1 || r.is_system === true ? 1 : 0,
        r.created_at ?? null,
        r.updated_at ?? null,
        r.deleted_at ?? null,
      ]
    )
    await conn.query('DELETE FROM categories WHERE id = ?', [id])
    await conn.commit()
  } catch (err) {
    await conn.rollback()
    if (err.code === 'ER_NO_SUCH_TABLE') {
      throw new Error('归档表不存在，请在 server 目录执行：npm run migrate')
    }
    throw err
  } finally {
    conn.release()
  }
  return { success: true, message: '分类已永久删除' }
}

/**
 * 获取已永久删除的分类列表（归档，只读）
 */
export async function listDeletedCategoriesLog() {
  const pool = getDbPool()
  try {
    const [rows] = await pool.query(
      `SELECT id, original_id, name, sort_order, filter_type, filter_tags, is_system,
              created_at, updated_at, soft_deleted_at, permanent_deleted_at
       FROM deleted_categories_log
       ORDER BY permanent_deleted_at DESC`
    )
    return rows
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') {
      return []
    }
    throw err
  }
}

/**
 * 批量调整分类顺序
 * @param {number[]} ids - 分类 ID 数组，按期望顺序排列
 */
export async function reorderCategories(ids) {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error('请提供分类 ID 列表')
  }

  const pool = getDbPool()
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    for (let i = 0; i < ids.length; i++) {
      await conn.query('UPDATE categories SET sort_order = ? WHERE id = ?', [i + 1, ids[i]])
    }

    await conn.commit()
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }

  return listCategories()
}

/**
 * 获取分类统计信息（仅未删除）
 */
export async function getCategoryStats() {
  const pool = getDbPool()
  const [rows] = await pool.query(`
    SELECT 
      c.id,
      c.name,
      c.sort_order,
      c.filter_type,
      c.is_system,
      COUNT(p.id) as photo_count
    FROM categories c
    LEFT JOIN photos p ON p.category = c.name AND p.status = 'approved' AND (p.hidden IS NULL OR p.hidden = 0)
    WHERE c.deleted_at IS NULL
    GROUP BY c.id
    ORDER BY c.sort_order ASC, c.id ASC
  `)
  return rows
}
