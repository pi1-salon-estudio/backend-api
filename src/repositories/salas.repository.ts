import { Timestamp, type DocumentData } from 'firebase-admin/firestore'
import { db } from '../config/firebase.js'

export interface SalaGuardada {
  id: string
  nombre: string
  anfitrionUid: string
  creadaEn: string
}

const salas = () => db.collection('salas')

function leerSala(id: string, datos: DocumentData): SalaGuardada {
  const creadaEn = datos.creadaEn instanceof Timestamp ? datos.creadaEn.toDate().toISOString() : new Date(0).toISOString()
  return {
    id,
    nombre: String(datos.nombre ?? ''),
    anfitrionUid: String(datos.anfitrionUid ?? ''),
    creadaEn,
  }
}

// doc() sin argumento le pide a Firestore un ID nuevo y único.
export async function guardarSala(nombre: string, anfitrionUid: string): Promise<SalaGuardada> {
  const ref = salas().doc()
  const creadaEn = Timestamp.now()
  await ref.set({ nombre, anfitrionUid, creadaEn })
  return { id: ref.id, nombre, anfitrionUid, creadaEn: creadaEn.toDate().toISOString() }
}

// Esta consulta usa el índice compuesto salas (anfitrionUid asc, creadaEn desc).
// Si se cambia el campo o el orden, el índice deja de servir y la consulta falla.
export async function listarSalasDe(anfitrionUid: string): Promise<SalaGuardada[]> {
  const resultado = await salas().where('anfitrionUid', '==', anfitrionUid).orderBy('creadaEn', 'desc').get()
  return resultado.docs.map((documento) => leerSala(documento.id, documento.data()))
}

export async function renombrarSala(id: string, nombre: string): Promise<void> {
  await salas().doc(id).update({ nombre })
}

export async function borrarSala(id: string): Promise<void> {
  await db.recursiveDelete(salas().doc(id))
}

export async function buscarSala(id: string): Promise<SalaGuardada | null> {
  const documento = await salas().doc(id).get()
  if (!documento.exists) return null
  return leerSala(documento.id, documento.data() ?? {})
}

// Borra cada sala con su subcolección de mensajes. Firestore no borra subcolecciones
// al borrar el documento padre; recursiveDelete sí.
export async function borrarSalasDe(anfitrionUid: string): Promise<number> {
  const resultado = await salas().where('anfitrionUid', '==', anfitrionUid).get()
  for (const documento of resultado.docs) {
    await db.recursiveDelete(documento.ref)
  }
  return resultado.size
}
