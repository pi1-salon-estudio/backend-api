import { AppError } from '../errors/app-error.js'
import { obtenerEstado, type BaseTecnica } from '../repositories/base-tecnica.repository.js'
import { conTiempoLimite } from '../utils/con-tiempo-limite.js'

const LIMITE_FIRESTORE_MS = 5000

// Capa de lógica: traduce lo que pasa en los datos a errores del contrato.
export async function obtenerBaseTecnica(): Promise<BaseTecnica> {
  let dato: BaseTecnica | null
  try {
    dato = await conTiempoLimite(obtenerEstado(), LIMITE_FIRESTORE_MS)
  } catch (error) {
    throw new AppError(
      503,
      'BD_NO_DISPONIBLE',
      'No pudimos consultar los datos. Intenta de nuevo en unos segundos.',
      { cause: error },
    )
  }

  if (!dato) {
    throw new AppError(404, 'DATO_NO_ENCONTRADO', 'No encontramos la información que buscas.')
  }
  return dato
}
