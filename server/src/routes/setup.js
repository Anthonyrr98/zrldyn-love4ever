import express from 'express'
import * as setupController from '../controllers/setupController.js'

const router = express.Router()

// GET /api/setup/status
router.get('/status', setupController.getStatus)

export default router

