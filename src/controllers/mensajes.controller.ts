import type { Request, Response } from 'express'
import { historialDe } from '../services/mensajes.service.js'

export async function getMensajes(req: Request, res: Response): Promise<void> {
  const pagina = await historialDe(String(req.params.id), req.query.limite, req.query.antes)
  res.json(pagina)
}
