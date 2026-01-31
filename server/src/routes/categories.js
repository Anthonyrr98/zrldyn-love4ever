import express from 'express'
import { authRequired, requireAdmin } from '../middleware/auth.js'
import {
  listCategories,
  listDeletedCategories,
  listDeletedCategoriesLog,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  restoreCategory,
  permanentDeleteCategory,
  reorderCategories,
  getCategoryStats,
} from '../services/categoryService.js'

const router = express.Router()

// 默认分类（categories 表不存在或未迁移时返回）
const DEFAULT_CATEGORIES = [
  { id: 1, name: '最新', sort_order: 1, filter_type: 'manual', filter_tags: null, is_system: 1 },
  { id: 2, name: '精选', sort_order: 2, filter_type: 'manual', filter_tags: null, is_system: 0 },
  { id: 3, name: '随览', sort_order: 3, filter_type: 'manual', filter_tags: null, is_system: 0 },
  { id: 4, name: '附近', sort_order: 4, filter_type: 'manual', filter_tags: null, is_system: 1 },
  { id: 5, name: '远方', sort_order: 5, filter_type: 'manual', filter_tags: null, is_system: 1 },
]

/**
 * GET /api/categories
 * 获取所有分类（公开接口）
 */
router.get('/', async (req, res, next) => {
  try {
    const categories = await listCategories()
    res.json(categories)
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE' || err.code === 'ER_BAD_FIELD_ERROR') {
      // eslint-disable-next-line no-console
      console.warn('[categories] 表未就绪，返回默认分类。请在 server 目录执行：npm run migrate', err.code, err.message)
      return res.json(DEFAULT_CATEGORIES)
    }
    next(err)
  }
})

/**
 * GET /api/categories/stats
 * 获取分类统计信息（含每个分类的照片数量，需管理员）
 */
router.get('/stats', authRequired, requireAdmin, async (req, res, next) => {
  try {
    const stats = await getCategoryStats()
    res.json(stats)
  } catch (err) {
    next(err)
  }
})

/**
 * GET /api/categories/deleted
 * 获取已删除的分类列表（需管理员，用于复原）
 */
router.get('/deleted', authRequired, requireAdmin, async (req, res, next) => {
  try {
    const list = await listDeletedCategories()
    res.json(list)
  } catch (err) {
    if (err.code === 'ER_BAD_FIELD_ERROR' || err.code === 'ER_NO_SUCH_TABLE') {
      return res.json([])
    }
    next(err)
  }
})

/**
 * DELETE /api/categories/deleted/:id
 * 永久删除已软删除的分类（不可恢复，需管理员）
 */
router.delete('/deleted/:id', authRequired, requireAdmin, async (req, res, next) => {
  try {
    const result = await permanentDeleteCategory(req.params.id)
    res.json(result)
  } catch (err) {
    if (err.message === '该分类不存在或未被删除，无法永久删除') {
      return res.status(400).json({ message: err.message })
    }
    next(err)
  }
})

/**
 * GET /api/categories/deleted-history
 * 已永久删除的分类归档列表（只读，需管理员）
 */
router.get('/deleted-history', authRequired, requireAdmin, async (req, res, next) => {
  try {
    const list = await listDeletedCategoriesLog()
    res.json(list)
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') {
      return res.json([])
    }
    next(err)
  }
})

/**
 * POST /api/categories/:id/restore
 * 复原已删除的分类（需管理员）
 */
router.post('/:id/restore', authRequired, requireAdmin, async (req, res, next) => {
  try {
    const category = await restoreCategory(req.params.id)
    res.json(category)
  } catch (err) {
    if (err.message === '该分类不存在或未被删除，无法复原') {
      return res.status(400).json({ message: err.message })
    }
    next(err)
  }
})

/**
 * GET /api/categories/:id
 * 获取单个分类详情
 */
router.get('/:id', async (req, res, next) => {
  try {
    const category = await getCategoryById(req.params.id)
    if (!category) {
      return res.status(404).json({ message: '分类不存在' })
    }
    res.json(category)
  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/categories
 * 创建新分类（需管理员）
 */
router.post('/', authRequired, requireAdmin, async (req, res, next) => {
  try {
    const { name, sort_order, filter_type, filter_tags } = req.body || {}

    if (!name || !name.trim()) {
      return res.status(400).json({ message: '分类名称不能为空' })
    }

    const category = await createCategory({
      name,
      sort_order,
      filter_type,
      filter_tags,
    })

    res.status(201).json(category)
  } catch (err) {
    if (err.message === '分类名称已存在') {
      return res.status(400).json({ message: err.message })
    }
    next(err)
  }
})

/**
 * PATCH /api/categories/:id
 * 更新分类（需管理员）
 */
router.patch('/:id', authRequired, requireAdmin, async (req, res, next) => {
  try {
    const { name, sort_order, filter_type, filter_tags } = req.body || {}

    const updated = await updateCategory(req.params.id, {
      name,
      sort_order,
      filter_type,
      filter_tags,
    })

    res.json(updated)
  } catch (err) {
    if (err.message === '分类不存在') {
      return res.status(404).json({ message: err.message })
    }
    if (err.message === '分类名称已存在' || err.message === '分类名称不能为空') {
      return res.status(400).json({ message: err.message })
    }
    next(err)
  }
})

/**
 * DELETE /api/categories/:id
 * 删除分类（需管理员，系统分类不可删）
 */
router.delete('/:id', authRequired, requireAdmin, async (req, res, next) => {
  try {
    const result = await deleteCategory(req.params.id)
    res.json(result)
  } catch (err) {
    if (err.message === '分类不存在') {
      return res.status(404).json({ message: err.message })
    }
    if (err.message === '系统内置分类不可删除') {
      return res.status(400).json({ message: err.message })
    }
    next(err)
  }
})

/**
 * POST /api/categories/reorder
 * 批量调整分类顺序（需管理员）
 */
router.post('/reorder', authRequired, requireAdmin, async (req, res, next) => {
  try {
    const { ids } = req.body || {}

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: '请提供分类 ID 列表' })
    }

    const categories = await reorderCategories(ids)
    res.json(categories)
  } catch (err) {
    next(err)
  }
})

export default router
