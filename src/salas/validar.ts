import { AppError } from '../errors/app-error.js'

const LARGO_MAXIMO = 60

// El nombre se recorta antes de medirlo: «   » cuenta como vacío.
export function leerSalaNueva(entrada: unknown): { nombre: string } {
  const valor =
    typeof entrada === 'object' && entrada !== null && 'nombre' in entrada && typeof entrada.nombre === 'string'
      ? entrada.nombre.trim()
      : ''
  if (!valor || valor.length > LARGO_MAXIMO) {
    throw new AppError(400, 'DATOS_INVALIDOS', 'Revisa los campos marcados.', {
      campos: { nombre: `Escribe un nombre de 1 a ${LARGO_MAXIMO} caracteres.` },
    })
  }
  return { nombre: valor }
}

// Un ID de documento de Firestore no puede tener «/» ni ser «.» o «..». Si llega así,
// la sala no existe: se responde 404 sin preguntarle a Firestore.
export function esIdValido(id: string): boolean {
  return id.length > 0 && id.length <= 1500 && !id.includes('/') && id !== '.' && id !== '..'
}
