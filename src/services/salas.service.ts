import { AppError } from '../errors/app-error.js'
import { buscarSala, guardarSala, listarSalasDe, type SalaGuardada } from '../repositories/salas.repository.js'
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
  const noEncontrada = new AppError(404, 'SALA_NO_ENCONTRADA', 'No encontramos una sala con ese ID.')
  if (!esIdValido(id)) throw noEncontrada
  const sala = await consultar(buscarSala(id))
  if (!sala) throw noEncontrada
  return paraQuien(sala, uid)
}
