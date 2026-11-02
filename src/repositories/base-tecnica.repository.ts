import { db } from '../config/firebase.js'

export interface BaseTecnica {
  mensaje: string
  actualizadoEn: string
}

// Capa de acceso a datos: solo sabe hablar con Firestore.
// Devuelve null si el documento no existe; no decide códigos HTTP.
export async function obtenerEstado(): Promise<BaseTecnica | null> {
  const documento = await db.collection('base_tecnica').doc('estado').get()
  if (!documento.exists) return null

  const datos = documento.data() ?? {}
  return {
    mensaje: String(datos.mensaje ?? ''),
    actualizadoEn:
      typeof datos.actualizadoEn?.toDate === 'function'
        ? datos.actualizadoEn.toDate().toISOString()
        : new Date(0).toISOString(),
  }
}
