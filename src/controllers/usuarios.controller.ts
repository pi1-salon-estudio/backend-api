import type { Request, Response } from 'express'
import { AppError } from '../errors/app-error.js'
import {
  actualizarPerfil,
  cerrarSesion,
  completarConGoogle,
  describirSesion,
  eliminarCuenta,
  registrarConCorreo,
} from '../services/usuarios.service.js'

function sesionDe(req: Request) {
  if (!req.sesion) throw new AppError(401, 'NO_AUTORIZADO', 'Inicia sesión para continuar.')
  return req.sesion
}

function perfilDe(req: Request) {
  if (!req.perfil) throw new AppError(403, 'PERFIL_INCOMPLETO', 'Elige un nombre de usuario para continuar.')
  return req.perfil
}

export async function postRegistro(req: Request, res: Response): Promise<void> {
  const perfil = await registrarConCorreo(req.body)
  res.status(201).json(perfil)
}

export async function postRegistroGoogle(req: Request, res: Response): Promise<void> {
  const perfil = await completarConGoogle(sesionDe(req), req.body)
  res.status(201).json(perfil)
}

export async function getSesion(req: Request, res: Response): Promise<void> {
  res.json(await describirSesion(sesionDe(req)))
}

export async function postCerrarSesion(req: Request, res: Response): Promise<void> {
  await cerrarSesion(sesionDe(req).uid)
  res.status(204).send()
}

export async function getPerfil(req: Request, res: Response): Promise<void> {
  res.json(perfilDe(req))
}

export async function patchPerfil(req: Request, res: Response): Promise<void> {
  res.json(await actualizarPerfil(perfilDe(req).uid, req.body))
}

export async function deletePerfil(req: Request, res: Response): Promise<void> {
  await eliminarCuenta(perfilDe(req))
  res.status(204).send()
}
