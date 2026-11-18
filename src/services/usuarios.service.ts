import { randomUUID } from 'node:crypto'
import { auth } from '../config/firebase.js'
import { borrarSalasDe } from '../repositories/salas.repository.js'
import { AppError } from '../errors/app-error.js'
import {
  actualizarPerfilCompleto,
  borrarDatos,
  completarPerfilGoogle,
  confirmarReserva,
  guardarPerfil,
  obtenerPerfil,
  reservarNombre,
  soltarNombre,
  type Perfil,
} from '../repositories/usuarios.repository.js'
import type { Sesion } from '../tipos/sesion.js'
import { conTiempoLimite } from '../utils/con-tiempo-limite.js'
import { claveDeUsuario, leerCambioPerfil, leerNombreUsuario, leerRegistro } from '../usuarios/validar.js'

const LIMITE_MS = 8000

export interface EstadoSesion {
  uid: string
  correo: string
  proveedor: Sesion['proveedor']
  perfilCompleto: boolean
  perfil: Perfil | null
}

function ocupado(): AppError {
  return new AppError(409, 'NOMBRE_USUARIO_OCUPADO', 'Ese nombre de usuario ya está en uso. Elige otro.', {
    campos: { nombreUsuario: 'Ese nombre de usuario ya está en uso. Elige otro.' },
  })
}

function correoRegistrado(): AppError {
  return new AppError(409, 'CORREO_YA_REGISTRADO', 'Este correo ya está registrado. Inicia sesión.', {
    campos: { correo: 'Este correo ya está registrado. Inicia sesión.' },
  })
}

function correoEnUso(): AppError {
  return new AppError(409, 'CORREO_EN_USO', 'Ese correo ya lo usa otra cuenta.', {
    campos: { correo: 'Ese correo ya lo usa otra cuenta.' },
  })
}

function correoNoEditable(): AppError {
  return new AppError(403, 'CORREO_NO_EDITABLE', 'Tu correo lo administra Google y no se puede cambiar aquí.', {
    campos: { correo: 'Tu correo lo administra Google y no se puede cambiar aquí.' },
  })
}

function noDisponible(error: unknown): AppError {
  return new AppError(503, 'SERVICIO_NO_DISPONIBLE', 'No pudimos completar la operación. Intenta de nuevo en unos segundos.', {
    cause: error,
  })
}

function codigoAuth(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) return String(error.code)
  return ''
}

async function consultar<T>(promesa: Promise<T>): Promise<T> {
  try {
    return await conTiempoLimite(promesa, LIMITE_MS)
  } catch (error) {
    throw noDisponible(error)
  }
}

function partirNombre(nombre: string): { nombres: string; apellidos: string } {
  const partes = nombre.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return { nombres: '', apellidos: '' }
  if (partes.length === 1) return { nombres: partes[0], apellidos: '' }
  return { nombres: partes[0], apellidos: partes.slice(1).join(' ') }
}

export async function registrarConCorreo(entrada: unknown): Promise<Perfil> {
  const datos = leerRegistro(entrada)
  const clave = claveDeUsuario(datos.nombreUsuario)
  const marca = randomUUID()
  const reservado = await consultar(reservarNombre(clave, marca))
  if (!reservado) throw ocupado()

  let uid: string | null = null
  try {
    const usuario = await auth.createUser({
      email: datos.correo,
      password: datos.contrasena,
      displayName: `${datos.nombres} ${datos.apellidos}`.trim(),
    })
    uid = usuario.uid
    const confirmada = await consultar(confirmarReserva(clave, marca, uid))
    if (!confirmada) throw noDisponible(new Error('La reserva del nombre de usuario se perdió.'))
    return await consultar(
      guardarPerfil({
        uid,
        nombres: datos.nombres,
        apellidos: datos.apellidos,
        nombreUsuario: datos.nombreUsuario,
        avatar: datos.avatar,
        correo: datos.correo,
        proveedor: 'correo',
      }),
    )
  } catch (error) {
    await soltarNombre(clave, marca, uid).catch((limpieza) => console.error('[LIMPIEZA_REGISTRO]', limpieza))
    if (uid) await auth.deleteUser(uid).catch((limpieza) => console.error('[LIMPIEZA_AUTH]', limpieza))
    if (error instanceof AppError) throw error
    if (codigoAuth(error) === 'auth/email-already-exists') throw correoRegistrado()
    throw noDisponible(error)
  }
}

export async function completarConGoogle(sesion: Sesion, entrada: unknown): Promise<Perfil> {
  if (sesion.proveedor !== 'google') {
    throw new AppError(400, 'PROVEEDOR_INVALIDO', 'Esta sesión no viene de Google.')
  }
  const nombreUsuario = leerNombreUsuario(entrada)
  const { nombres, apellidos } = partirNombre(sesion.nombre)
  const resultado = await consultar(
    completarPerfilGoogle(
      {
        uid: sesion.uid,
        nombres: nombres || sesion.correo,
        apellidos,
        nombreUsuario,
        avatar: sesion.avatar,
        correo: sesion.correo,
        proveedor: 'google',
      },
      claveDeUsuario(nombreUsuario),
    ),
  )
  if (resultado.tipo === 'ocupado') throw ocupado()
  return resultado.perfil
}

export async function describirSesion(sesion: Sesion): Promise<EstadoSesion> {
  const perfil = await consultar(obtenerPerfil(sesion.uid))
  return {
    uid: sesion.uid,
    correo: sesion.correo,
    proveedor: sesion.proveedor,
    perfilCompleto: Boolean(perfil?.nombreUsuario),
    perfil,
  }
}

export async function perfilCompleto(uid: string): Promise<Perfil> {
  const perfil = await consultar(obtenerPerfil(uid))
  if (!perfil?.nombreUsuario) {
    throw new AppError(403, 'PERFIL_INCOMPLETO', 'Elige un nombre de usuario para continuar.')
  }
  return perfil
}

// Auth y Firestore no comparten transacción. Primero se cambia el correo en Auth, que ya
// garantiza que no se repita; después la transacción de Firestore. Si la segunda falla,
// se devuelve el correo anterior en Auth para no dejar las dos fuentes distintas.
export async function actualizarPerfil(perfil: Perfil, entrada: unknown): Promise<Perfil> {
  const cambios = leerCambioPerfil(entrada)
  const correoCambia = cambios.correo !== perfil.correo.toLowerCase()

  if (correoCambia && perfil.proveedor === 'google') throw correoNoEditable()

  if (correoCambia) {
    try {
      await conTiempoLimite(auth.updateUser(perfil.uid, { email: cambios.correo }), LIMITE_MS)
    } catch (error) {
      if (codigoAuth(error) === 'auth/email-already-exists') throw correoEnUso()
      throw noDisponible(error)
    }
  }

  const devolverCorreo = async () => {
    if (!correoCambia) return
    await auth
      .updateUser(perfil.uid, { email: perfil.correo })
      .catch((reversion) => console.error('[REVERSION_CORREO]', perfil.uid, reversion))
  }

  let resultado
  try {
    resultado = await consultar(
      actualizarPerfilCompleto(perfil.uid, cambios, claveDeUsuario(cambios.nombreUsuario), claveDeUsuario),
    )
  } catch (error) {
    await devolverCorreo()
    throw error
  }

  if (resultado.tipo === 'listo') return resultado.perfil
  await devolverCorreo()
  if (resultado.tipo === 'ocupado') throw ocupado()
  throw new AppError(404, 'PERFIL_NO_ENCONTRADO', 'No encontramos tu perfil.')
}

export async function cerrarSesion(uid: string): Promise<void> {
  try {
    await auth.revokeRefreshTokens(uid)
  } catch (error) {
    throw noDisponible(error)
  }
}

// Orden pensado para no dejar datos huérfanos: primero lo que vive en Firestore y al final
// la cuenta de Authentication. Mientras la cuenta exista, el token sigue sirviendo y un
// reintento puede terminar lo que faltó. Cada paso se puede repetir sin error.
export async function eliminarCuenta(uid: string): Promise<void> {
  try {
    await conTiempoLimite(borrarSalasDe(uid), LIMITE_MS * 2)
    const perfil = await conTiempoLimite(obtenerPerfil(uid), LIMITE_MS)
    if (perfil) await conTiempoLimite(borrarDatos(uid, claveDeUsuario(perfil.nombreUsuario)), LIMITE_MS)
  } catch (error) {
    console.error('[ELIMINAR_CUENTA_FIRESTORE]', uid, error)
    throw noDisponible(error)
  }
  try {
    await auth.deleteUser(uid)
  } catch (error) {
    if (codigoAuth(error) !== 'auth/user-not-found') throw noDisponible(error)
  }
}
