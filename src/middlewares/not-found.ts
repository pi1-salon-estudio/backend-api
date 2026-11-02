import type { Request, Response } from 'express'

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({
    error: { codigo: 'RUTA_NO_ENCONTRADA', mensaje: 'La dirección que buscas no existe.' },
  })
}
