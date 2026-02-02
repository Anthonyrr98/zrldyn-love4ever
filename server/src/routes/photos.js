import express from 'express'
import { authRequired, requireAdmin, optionalAuth } from '../middleware/auth.js'
import * as photoController from '../controllers/photoController.js'

const router = express.Router()

router.get('/', optionalAuth, photoController.getList)
router.get('/stats', authRequired, photoController.getStats)
router.post('/:id/like', photoController.like)
router.post('/:id/unlike', photoController.unlike)
router.get('/:id', optionalAuth, photoController.getById)
router.post('/', authRequired, requireAdmin, photoController.create)
router.post('/upload-oss', authRequired, requireAdmin, photoController.uploadMiddleware, photoController.uploadOss)
router.patch('/:id', authRequired, requireAdmin, photoController.update)
router.post('/:id/approve', authRequired, requireAdmin, photoController.approve)
router.post('/:id/reject', authRequired, requireAdmin, photoController.reject)
router.delete('/:id', authRequired, requireAdmin, photoController.remove)

export default router
