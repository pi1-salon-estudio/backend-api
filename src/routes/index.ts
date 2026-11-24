import { Router } from 'express'
import { getBaseTecnica } from '../controllers/base-tecnica.controller.js'
import { getMensajes } from '../controllers/mensajes.controller.js'
import { deleteSala, getSala, getSalas, patchSala, postSala } from '../controllers/salas.controller.js'
import {
  deletePerfil,
  getPerfil,
  getSesion,
  patchPerfil,
  postCerrarSesion,
  postRegistro,
  postRegistroGoogle,
} from '../controllers/usuarios.controller.js'
import { exigirPerfil } from '../middlewares/exigir-perfil.js'
import { exigirSesion } from '../middlewares/exigir-sesion.js'

export const router = Router()

// No consulta Firestore: Render la usa para saber si el servicio está vivo.
router.get('/health', (_req, res) => {
  res.json({ estado: 'ok' })
})

router.get('/api/v1/base-tecnica', getBaseTecnica)

router.post('/api/v1/usuarios', postRegistro)
router.post('/api/v1/usuarios/google', exigirSesion, postRegistroGoogle)
router.get('/api/v1/sesion', exigirSesion, getSesion)
router.post('/api/v1/sesion/cerrar', exigirSesion, postCerrarSesion)
router.get('/api/v1/perfil', exigirSesion, exigirPerfil, getPerfil)
router.patch('/api/v1/perfil', exigirSesion, exigirPerfil, patchPerfil)
// Sin exigirPerfil: si un borrado quedó a medias, el reintento debe funcionar aunque el perfil ya no exista.
router.delete('/api/v1/perfil', exigirSesion, deletePerfil)

router.post('/api/v1/salas', exigirSesion, exigirPerfil, postSala)
router.get('/api/v1/salas', exigirSesion, exigirPerfil, getSalas)
router.get('/api/v1/salas/:id', exigirSesion, exigirPerfil, getSala)
router.patch('/api/v1/salas/:id', exigirSesion, exigirPerfil, patchSala)
router.delete('/api/v1/salas/:id', exigirSesion, exigirPerfil, deleteSala)
router.get('/api/v1/salas/:id/mensajes', exigirSesion, exigirPerfil, getMensajes)
