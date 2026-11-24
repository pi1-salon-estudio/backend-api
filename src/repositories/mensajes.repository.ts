import { Timestamp, type DocumentData, type DocumentSnapshot } from 'firebase-admin/firestore'
import { db } from '../config/firebase.js'

export interface MensajeGuardado {
  id: string
  salaId: string
  texto: string
  autorUid: string
  nombreUsuario: string
  creadoEn: string
}

export interface PaginaMensajes {
  mensajes: MensajeGuardado[]
  hayAnteriores: boolean
}

function mensajesDe(salaId: string) {
  return db.collection('salas').doc(salaId).collection('mensajes')
}

function leer(salaId: string, id: string, datos: DocumentData): MensajeGuardado {
  const creadoEn = datos.creadoEn instanceof Timestamp ? datos.creadoEn.toDate().toISOString() : new Date(0).toISOString()
  return {
    id,
    salaId,
    texto: String(datos.texto ?? ''),
    autorUid: String(datos.autorUid ?? ''),
    nombreUsuario: String(datos.nombreUsuario ?? ''),
    creadoEn,
  }
}

// La página llega de la más nueva a la más vieja y se devuelve al revés,
// que es el orden en que se lee el chat. Se pide uno de más para saber si hay anteriores.
export async function listarMensajes(salaId: string, limite: number, antes: DocumentSnapshot | null): Promise<PaginaMensajes> {
  let consulta = mensajesDe(salaId).orderBy('creadoEn', 'desc')
  if (antes) consulta = consulta.startAfter(antes)
  const resultado = await consulta.limit(limite + 1).get()
  const hayAnteriores = resultado.docs.length > limite
  const pagina = resultado.docs.slice(0, limite).reverse()
  return {
    mensajes: pagina.map((documento) => leer(salaId, documento.id, documento.data())),
    hayAnteriores,
  }
}

export async function buscarMensaje(salaId: string, id: string): Promise<DocumentSnapshot | null> {
  const documento = await mensajesDe(salaId).doc(id).get()
  if (!documento.exists) return null
  return documento
}
