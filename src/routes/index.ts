import { Router } from 'express'
import { getBaseTecnica } from '../controllers/base-tecnica.controller.js'

export const router = Router()

// No consulta Firestore: Render la usa para saber si el servicio está vivo.
router.get('/health', (_req, res) => {
  res.json({ estado: 'ok' })
})

router.get('/api/v1/base-tecnica', getBaseTecnica)
