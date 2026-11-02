import type { Request, Response } from 'express'
import { obtenerBaseTecnica } from '../services/base-tecnica.service.js'

// Capa HTTP: recibe la petición, llama al servicio y responde.
// Express 5 envía al manejador de errores cualquier excepción de una función async.
export async function getBaseTecnica(_req: Request, res: Response): Promise<void> {
  const dato = await obtenerBaseTecnica()
  res.json(dato)
}
