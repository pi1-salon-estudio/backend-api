import type { Perfil } from '../repositories/usuarios.repository.js'

export interface Sesion {
  uid: string
  correo: string
  nombre: string
  avatar: string
  proveedor: 'correo' | 'google'
}

declare global {
  namespace Express {
    interface Request {
      sesion?: Sesion
      perfil?: Perfil
    }
  }
}
