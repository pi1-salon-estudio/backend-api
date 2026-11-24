import type { Request, Response } from 'express'
import { AppError } from '../errors/app-error.js'
import { crearSala, editarSala, eliminarSala, listarSalasPropias, obtenerSala } from '../services/salas.service.js'

function uidDe(req: Request): string {
  if (!req.perfil) throw new AppError(403, 'PERFIL_INCOMPLETO', 'Elige un nombre de usuario para continuar.')
  return req.perfil.uid
}

export async function postSala(req: Request, res: Response): Promise<void> {
  const sala = await crearSala(uidDe(req), req.body)
  res.status(201).location(`/api/v1/salas/${sala.id}`).json(sala)
}

export async function getSalas(req: Request, res: Response): Promise<void> {
  res.json({ salas: await listarSalasPropias(uidDe(req)) })
}

export async function getSala(req: Request, res: Response): Promise<void> {
  res.json(await obtenerSala(uidDe(req), String(req.params.id)))
}

export async function patchSala(req: Request, res: Response): Promise<void> {
  res.json(await editarSala(uidDe(req), String(req.params.id), req.body))
}

export async function deleteSala(req: Request, res: Response): Promise<void> {
  await eliminarSala(uidDe(req), String(req.params.id))
  res.status(204).send()
}
