import { FieldValue, Timestamp, type DocumentData } from 'firebase-admin/firestore'
import { db } from '../config/firebase.js'

export interface Perfil {
  uid: string
  nombres: string
  apellidos: string
  nombreUsuario: string
  avatar: string
  correo: string
  proveedor: 'correo' | 'google'
  creadoEn: string
}

export interface PerfilNuevo {
  uid: string
  nombres: string
  apellidos: string
  nombreUsuario: string
  avatar: string
  correo: string
  proveedor: 'correo' | 'google'
}

const usuarios = () => db.collection('usuarios')
const nombres = () => db.collection('nombres_usuario')

function fechaDe(valor: unknown): string {
  if (valor instanceof Timestamp) return valor.toDate().toISOString()
  if (typeof valor === 'string') return valor
  return new Date(0).toISOString()
}

export function leerPerfil(datos: DocumentData, uid: string): Perfil {
  return {
    uid,
    nombres: String(datos.nombres ?? ''),
    apellidos: String(datos.apellidos ?? ''),
    nombreUsuario: String(datos.nombreUsuario ?? ''),
    avatar: String(datos.avatar ?? ''),
    correo: String(datos.correo ?? ''),
    proveedor: datos.proveedor === 'google' ? 'google' : 'correo',
    creadoEn: fechaDe(datos.creadoEn),
  }
}

export async function obtenerPerfil(uid: string): Promise<Perfil | null> {
  const documento = await usuarios().doc(uid).get()
  if (!documento.exists) return null
  return leerPerfil(documento.data() ?? {}, uid)
}

export async function reservarNombre(clave: string, marca: string): Promise<boolean> {
  const ref = nombres().doc(clave)
  return db.runTransaction(async (tx) => {
    const documento = await tx.get(ref)
    if (documento.exists) return false
    tx.set(ref, { marca })
    return true
  })
}

export async function confirmarReserva(clave: string, marca: string, uid: string): Promise<boolean> {
  const ref = nombres().doc(clave)
  return db.runTransaction(async (tx) => {
    const documento = await tx.get(ref)
    if (!documento.exists || documento.data()?.marca !== marca) return false
    tx.update(ref, { uid, marca: FieldValue.delete() })
    return true
  })
}

export async function soltarNombre(clave: string, marca: string, uid: string | null): Promise<void> {
  const ref = nombres().doc(clave)
  await db.runTransaction(async (tx) => {
    const documento = await tx.get(ref)
    if (!documento.exists) return
    const datos = documento.data() ?? {}
    const esNuestra = datos.marca === marca || (uid !== null && datos.uid === uid)
    if (esNuestra) tx.delete(ref)
  })
}

export async function guardarPerfil(perfil: PerfilNuevo): Promise<Perfil> {
  const creadoEn = Timestamp.now()
  await usuarios().doc(perfil.uid).set({ ...perfil, creadoEn })
  return { ...perfil, creadoEn: creadoEn.toDate().toISOString() }
}

export type ResultadoGoogle = { tipo: 'listo'; perfil: Perfil } | { tipo: 'ocupado' }

export async function completarPerfilGoogle(perfil: PerfilNuevo, clave: string): Promise<ResultadoGoogle> {
  const perfilRef = usuarios().doc(perfil.uid)
  const nombreRef = nombres().doc(clave)
  return db.runTransaction(async (tx) => {
    const actual = await tx.get(perfilRef)
    const reserva = await tx.get(nombreRef)
    if (actual.exists) {
      const datos = actual.data() ?? {}
      if (datos.nombreUsuario) return { tipo: 'listo', perfil: leerPerfil(datos, perfil.uid) }
    }
    const dueno = reserva.data()?.uid
    if (reserva.exists && dueno && dueno !== perfil.uid) return { tipo: 'ocupado' }

    const creadoEn = Timestamp.now()
    tx.set(nombreRef, { uid: perfil.uid })
    tx.set(perfilRef, { ...perfil, creadoEn })
    return {
      tipo: 'listo',
      perfil: { ...perfil, creadoEn: creadoEn.toDate().toISOString() },
    }
  })
}

export type ResultadoCambio =
  | { tipo: 'listo'; perfil: Perfil }
  | { tipo: 'ocupado' }
  | { tipo: 'sin_perfil' }

// Todo en una transacción: si dos personas piden el mismo nombre de usuario al tiempo,
// Firestore reintenta una de las dos y esa ve la reserva de la otra. Nunca quedan las dos.
export async function actualizarPerfilCompleto(
  uid: string,
  cambios: { nombres: string; apellidos: string; avatar: string; nombreUsuario: string; correo: string },
  claveNueva: string,
  claveDe: (nombreUsuario: string) => string,
): Promise<ResultadoCambio> {
  const perfilRef = usuarios().doc(uid)
  const nuevaRef = nombres().doc(claveNueva)
  return db.runTransaction(async (tx) => {
    // En una transacción de Firestore todas las lecturas van antes de cualquier escritura.
    const actual = await tx.get(perfilRef)
    if (!actual.exists) return { tipo: 'sin_perfil' }
    const datos = actual.data() ?? {}
    const claveVieja = claveDe(String(datos.nombreUsuario ?? ''))

    if (claveNueva !== claveVieja) {
      const reserva = await tx.get(nuevaRef)
      if (reserva.exists && reserva.data()?.uid !== uid) return { tipo: 'ocupado' }
      tx.set(nuevaRef, { uid })
      if (claveVieja) tx.delete(nombres().doc(claveVieja))
    }

    tx.update(perfilRef, cambios)
    return { tipo: 'listo', perfil: leerPerfil({ ...datos, ...cambios }, uid) }
  })
}

// Perfil y reserva del nombre en una sola transacción. La reserva solo se borra si es de
// esta persona: así un reintento nunca libera un nombre que ya tomó otra cuenta.
export async function borrarDatos(uid: string, clave: string): Promise<void> {
  const perfilRef = usuarios().doc(uid)
  const nombreRef = nombres().doc(clave)
  await db.runTransaction(async (tx) => {
    const reserva = clave ? await tx.get(nombreRef) : null
    tx.delete(perfilRef)
    if (reserva?.exists && reserva.data()?.uid === uid) tx.delete(nombreRef)
  })
}
