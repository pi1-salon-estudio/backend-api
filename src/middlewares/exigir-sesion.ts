import type { NextFunction, Request, Response } from 'express'
import { auth } from '../config/firebase.js'
import { AppError } from '../errors/app-error.js'
import type { Sesion } from '../tipos/sesion.js'

const SIN_SESION = new AppError(401, 'NO_AUTORIZADO', 'Inicia sesión para continuar.')

function proveedorDe(valor: string | undefined): Sesion['proveedor'] {
  return valor === 'google.com' ? 'google' : 'correo'
}

// Toda ruta privada exige un ID token vigente. Sin token, o con uno revocado, responde 401.
export async function exigirSesion(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const encabezado = req.header('authorization') ?? ''
    const espacio = encabezado.indexOf(' ')
    const esquema = espacio === -1 ? '' : encabezado.slice(0, espacio)
    const token = espacio === -1 ? '' : encabezado.slice(espacio + 1).trim()
    if (esquema.toLowerCase() !== 'bearer' || !token) {
      next(SIN_SESION)
      return
    }

    const decodificado = await auth.verifyIdToken(token, true)
    if (!decodificado.uid || !decodificado.email) {
      next(SIN_SESION)
      return
    }

    req.sesion = {
      uid: decodificado.uid,
      correo: decodificado.email,
      nombre: decodificado.name ?? '',
      avatar: typeof decodificado.picture === 'string' ? decodificado.picture : '',
      proveedor: proveedorDe(decodificado.firebase?.sign_in_provider),
    }
    next()
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(401, 'NO_AUTORIZADO', SIN_SESION.message, { cause: error }))
  }
}
