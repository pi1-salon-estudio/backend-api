import { AppError } from '../errors/app-error.js'
import { borrarSala, buscarSala, guardarSala, listarSalasDe, renombrarSala, type SalaGuardada } from '../repositories/salas.repository.js'
import { esIdValido, leerSalaNueva } from '../salas/validar.js'
import { conTiempoLimite } from '../utils/con-tiempo-limite.js'

const LIMITE_MS = 8000

export interface Sala {
  id: string
  nombre: string
  creadaEn: string
  esAnfitrion: boolean
}

async function consultar<T>(promesa: Promise<T>): Promise<T> {
  try {
    return await conTiempoLimite(promesa, LIMITE_MS)
  } catch (error) {
    throw new AppError(503, 'SERVICIO_NO_DISPONIBLE', 'No pudimos completar la operación. Intenta de nuevo en unos segundos.', {
      cause: error,
    })
  }
}

// El uid del anfitrión no sale de la API: el frontend solo necesita saber si es suya.
function paraQuien(sala: SalaGuardada, uid: string): Sala {
  return { id: sala.id, nombre: sala.nombre, creadaEn: sala.creadaEn, esAnfitrion: sala.anfitrionUid === uid }
}

export async function crearSala(uid: string, entrada: unknown): Promise<Sala> {
  const { nombre } = leerSalaNueva(entrada)
  return paraQuien(await consultar(guardarSala(nombre, uid)), uid)
}

export async function listarSalasPropias(uid: string): Promise<Sala[]> {
  const salas = await consultar(listarSalasDe(uid))
  return salas.map((sala) => paraQuien(sala, uid))
}

export async function obtenerSala(uid: string, id: string): Promise<Sala> {
  return paraQuien(await salaExistente(id), uid)
}

async function salaExistente(id: string): Promise<SalaGuardada> {
  const noEncontrada = new AppError(404, 'SALA_NO_ENCONTRADA', 'No encontramos una sala con ese ID.')
  if (!esIdValido(id)) throw noEncontrada
  const sala = await consultar(buscarSala(id))
  if (!sala) throw noEncontrada
  return sala
}

async function salaDelAnfitrion(uid: string, id: string): Promise<SalaGuardada> {
  const sala = await salaExistente(id)
  if (sala.anfitrionUid !== uid) {
    throw new AppError(403, 'SIN_PERMISO', 'Solo quien creó la sala puede cambiarla.')
  }
  return sala
}

export async function editarSala(uid: string, id: string, entrada: unknown): Promise<Sala> {
  const sala = await salaDelAnfitrion(uid, id)
  const { nombre } = leerSalaNueva(entrada)
  await consultar(renombrarSala(sala.id, nombre))
  return paraQuien({ ...sala, nombre }, uid)
}

export async function eliminarSala(uid: string, id: string): Promise<void> {
  const sala = await salaDelAnfitrion(uid, id)
  await consultar(borrarSala(sala.id))
}
