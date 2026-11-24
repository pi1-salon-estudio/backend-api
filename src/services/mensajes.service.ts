import { AppError } from '../errors/app-error.js'
import { buscarMensaje, listarMensajes, type PaginaMensajes } from '../repositories/mensajes.repository.js'
import { buscarSala } from '../repositories/salas.repository.js'
import { esIdValido } from '../salas/validar.js'
import { conTiempoLimite } from '../utils/con-tiempo-limite.js'

const LIMITE_MS = 8000
const POR_PAGINA = 30
const MAXIMO = 50

function leerLimite(valor: unknown): number {
  if (valor === undefined) return POR_PAGINA
  const numero = Number(valor)
  if (!Number.isInteger(numero) || numero < 1 || numero > MAXIMO) {
    throw new AppError(400, 'DATOS_INVALIDOS', 'Revisa los campos marcados.', {
      campos: { limite: `Pide entre 1 y ${MAXIMO} mensajes.` },
    })
  }
  return numero
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

export async function historialDe(salaId: string, limite: unknown, antes: unknown): Promise<PaginaMensajes> {
  const noEncontrada = new AppError(404, 'SALA_NO_ENCONTRADA', 'No encontramos una sala con ese ID.')
  if (!esIdValido(salaId)) throw noEncontrada
  const sala = await consultar(buscarSala(salaId))
  if (!sala) throw noEncontrada

  const cantidad = leerLimite(limite)
  let cursor = null
  if (antes !== undefined) {
    if (typeof antes !== 'string' || !esIdValido(antes)) {
      throw new AppError(400, 'DATOS_INVALIDOS', 'Revisa los campos marcados.', {
        campos: { antes: 'Ese mensaje no está en esta sala.' },
      })
    }
    cursor = await consultar(buscarMensaje(salaId, antes))
    if (!cursor) {
      throw new AppError(400, 'DATOS_INVALIDOS', 'Revisa los campos marcados.', {
        campos: { antes: 'Ese mensaje no está en esta sala.' },
      })
    }
  }
  return consultar(listarMensajes(salaId, cantidad, cursor))
}
