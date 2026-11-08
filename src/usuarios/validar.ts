import { AppError } from '../errors/app-error.js'

const NOMBRE_USUARIO = /^[A-Za-z][A-Za-z0-9_]{2,19}$/
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const LARGA_MINIMA = 8

export interface RegistroCorreo {
  nombres: string
  apellidos: string
  nombreUsuario: string
  avatar: string
  correo: string
  contrasena: string
}

export interface CambioPerfil {
  nombres: string
  apellidos: string
  avatar: string
}

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
}

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : ''
}

function datosInvalidos(campos: Record<string, string>): AppError {
  return new AppError(400, 'DATOS_INVALIDOS', 'Revisa los campos marcados.', { campos })
}

function revisarNombre(valor: string, etiqueta: string, campos: Record<string, string>, clave: string): void {
  if (!valor) campos[clave] = `Escribe ${etiqueta}.`
  else if (valor.length > 80) campos[clave] = `${etiqueta} no puede pasar de 80 caracteres.`
}

export function leerRegistro(entrada: unknown): RegistroCorreo {
  if (!esObjeto(entrada)) throw datosInvalidos({ formulario: 'Faltan los datos del registro.' })

  const campos: Record<string, string> = {}
  const nombres = texto(entrada.nombres)
  const apellidos = texto(entrada.apellidos)
  const nombreUsuario = texto(entrada.nombreUsuario)
  const avatar = texto(entrada.avatar)
  const correo = texto(entrada.correo).toLowerCase()
  const contrasena = typeof entrada.contrasena === 'string' ? entrada.contrasena : ''

  revisarNombre(nombres, 'tus nombres', campos, 'nombres')
  revisarNombre(apellidos, 'tus apellidos', campos, 'apellidos')
  if (!nombreUsuario) campos.nombreUsuario = 'Elige un nombre de usuario.'
  else if (!NOMBRE_USUARIO.test(nombreUsuario)) {
    campos.nombreUsuario =
      'Usa de 3 a 20 caracteres: empieza con una letra y sigue con letras, números o guion bajo.'
  }
  if (!avatar) campos.avatar = 'Elige un avatar.'
  else if (avatar.length > 2000) campos.avatar = 'El avatar es demasiado largo.'
  if (!correo || !CORREO.test(correo) || correo.length > 320) {
    campos.correo = 'Escribe un correo válido.'
  }
  if (contrasena.length < LARGA_MINIMA) {
    campos.contrasena = 'La contraseña debe tener al menos 8 caracteres.'
  } else if (contrasena.length > 64) {
    campos.contrasena = 'La contraseña no puede pasar de 64 caracteres.'
  }

  if (Object.keys(campos).length > 0) throw datosInvalidos(campos)
  return { nombres, apellidos, nombreUsuario, avatar, correo, contrasena }
}

export function leerNombreUsuario(entrada: unknown): string {
  if (!esObjeto(entrada)) throw datosInvalidos({ nombreUsuario: 'Elige un nombre de usuario.' })
  const nombreUsuario = texto(entrada.nombreUsuario)
  if (!NOMBRE_USUARIO.test(nombreUsuario)) {
    throw datosInvalidos({
      nombreUsuario:
        'Usa de 3 a 20 caracteres: empieza con una letra y sigue con letras, números o guion bajo.',
    })
  }
  return nombreUsuario
}

export function leerCambioPerfil(entrada: unknown): CambioPerfil {
  if (!esObjeto(entrada)) throw datosInvalidos({ formulario: 'Faltan los datos del perfil.' })
  if ('nombreUsuario' in entrada || 'correo' in entrada || 'contrasena' in entrada) {
    throw new AppError(
      400,
      'DATOS_INVALIDOS',
      'Aquí solo se pueden cambiar los nombres, los apellidos y el avatar.',
    )
  }

  const campos: Record<string, string> = {}
  const nombres = texto(entrada.nombres)
  const apellidos = texto(entrada.apellidos)
  const avatar = texto(entrada.avatar)
  revisarNombre(nombres, 'tus nombres', campos, 'nombres')
  revisarNombre(apellidos, 'tus apellidos', campos, 'apellidos')
  if (!avatar) campos.avatar = 'Elige un avatar.'
  else if (avatar.length > 2000) campos.avatar = 'El avatar es demasiado largo.'
  if (Object.keys(campos).length > 0) throw datosInvalidos(campos)
  return { nombres, apellidos, avatar }
}

export function claveDeUsuario(nombreUsuario: string): string {
  return nombreUsuario.toLocaleLowerCase('es-CO')
}
