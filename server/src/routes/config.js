import express from 'express'
import { authRequired, requireAdmin } from '../middleware/auth.js'
import * as configController from '../controllers/configController.js'

const router = express.Router()

router.get('/', authRequired, requireAdmin, configController.getAll)
router.post('/', authRequired, requireAdmin, configController.save)
router.get('/public', configController.getPublic)

export default router
