import type { NextFunction, Request, Response } from 'express'
import { AppError } from '../errors/app-error.js'

// Manejador central de errores. Nunca envía al cliente detalles internos
// (stack, mensajes de Firestore): esos quedan solo en los logs del servidor.
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof AppError) {
    if (error.status >= 500) console.error(`[${error.codigo}]`, error.cause ?? error)
    res.status(error.status).json({ error: { codigo: error.codigo, mensaje: error.message } })
    return
  }

  console.error('[ERROR_INTERNO]', error)
  res.status(500).json({
    error: {
      codigo: 'ERROR_INTERNO',
      mensaje: 'Algo salió mal de nuestro lado. Intenta de nuevo más tarde.',
    },
  })
}
