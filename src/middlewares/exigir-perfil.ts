import type { NextFunction, Request, Response } from 'express'
import { AppError } from '../errors/app-error.js'
import { perfilCompleto } from '../services/usuarios.service.js'

// Quien entró con Google y todavía no elige nombre de usuario no pasa a una ruta privada.
export async function exigirPerfil(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.sesion) {
      next(new AppError(401, 'NO_AUTORIZADO', 'Inicia sesión para continuar.'))
      return
    }
    req.perfil = await perfilCompleto(req.sesion.uid)
    next()
  } catch (error) {
    next(error)
  }
}
