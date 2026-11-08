# backend-api

API REST del Salón de Estudio Colaborativo (Mini-proyecto 2 de Proyecto Integrador I, Universidad del Valle).

Es la única parte del sistema que habla con Firestore. El frontend le pide los datos a esta API y nunca consulta la base de datos directamente.

## Enlaces

| Qué | URL |
|---|---|
| API en producción | https://pi1-salon-estudio-api.onrender.com |
| Documentación (Swagger) | https://pi1-salon-estudio-api.onrender.com/docs |
| Estado del servicio | https://pi1-salon-estudio-api.onrender.com/health |
| Frontend | https://pi1-salon-estudio.vercel.app |

La API está en el plan gratuito de Render. Si pasa un rato sin recibir peticiones, Render la apaga, y la primera petición después de eso puede tardar cerca de un minuto mientras vuelve a arrancar.

## Tecnologías

Node.js 24, TypeScript, Express 5, Firebase Admin SDK (Firestore), Swagger UI y Docker.

## Endpoints

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/health` | Responde `{"estado":"ok"}` si el servicio está vivo. No consulta Firestore. |
| GET | `/api/v1/base-tecnica` | Devuelve el documento `base_tecnica/estado` de Firestore (TS-00). |
| POST | `/api/v1/usuarios` | Crea la cuenta con correo y contraseña, y guarda el perfil (TS-01). |
| POST | `/api/v1/usuarios/google` | Completa el perfil después de entrar con Google. Exige el ID token. |
| GET | `/api/v1/sesion` | Dice si la sesión tiene el perfil completo. |
| POST | `/api/v1/sesion/cerrar` | Revoca la sesión en Firebase. |
| GET | `/api/v1/perfil` | Devuelve el perfil. Sin token responde 401. |
| PATCH | `/api/v1/perfil` | Cambia nombres, apellidos y avatar. |
| DELETE | `/api/v1/perfil` | Elimina la cuenta, el perfil y el nombre de usuario. |
| GET | `/docs` | Swagger UI con el contrato de la API. |

El ingreso con correo y contraseña lo hace Firebase Authentication en el navegador. Esta API no recibe la contraseña en el ingreso: comprueba el ID token. La contraseña del registro se entrega a Firebase y no se guarda en Firestore.

Las rutas privadas llevan `Authorization: Bearer <ID token>`. Sin token, o con un token revocado, responden 401. Si la persona entró con Google y todavía no elige nombre de usuario, `/api/v1/perfil` responde 403.

`firestore.rules` niega todo acceso directo del navegador a Firestore. El Admin SDK no usa esas reglas. Hay que publicarlas en la consola de Firebase para que un cliente no pueda leer ni escribir las colecciones `usuarios` y `nombres_usuario`.

El contrato completo está en [`docs/openapi.yaml`](docs/openapi.yaml). Cualquier cambio en un endpoint empieza por ese archivo.

Todos los errores tienen la misma forma:

```json
{ "error": { "codigo": "BD_NO_DISPONIBLE", "mensaje": "No pudimos consultar los datos. Intenta de nuevo en unos segundos." } }
```

`codigo` no cambia y es lo que usa el frontend para decidir qué mostrar. `mensaje` está escrito para el estudiante. Los detalles técnicos del error solo quedan en los logs del servidor.

## Variables de entorno

| Variable | Para qué sirve | En local | En Render |
|---|---|---|---|
| `PORT` | Puerto donde escucha la API | `3000` | No se define, Render la asigna |
| `CORS_ORIGINS` | Orígenes que pueden llamar a la API, separados por coma | `http://localhost:5173,http://localhost:8080` | `https://pi1-salon-estudio.vercel.app` |
| `GOOGLE_APPLICATION_CREDENTIALS` | Ruta al JSON de la cuenta de servicio de Firebase | Ruta en tu equipo, fuera del repositorio | `/etc/secrets/firebase-admin.json` (Secret File) |

La llave de Firebase nunca se sube al repositorio. El `.gitignore` y el `.dockerignore` bloquean `.env` y cualquier archivo `*firebase-admin*.json` o `*serviceAccount*.json`. Si necesitas la llave para trabajar en local, pídesela al responsable de la infraestructura y guárdala en una carpeta fuera del proyecto.

## Ejecutar en local

Requisitos: Node.js 24 y npm.

```powershell
npm ci
Copy-Item .env.example .env
```

Abre `.env` y revisa que `GOOGLE_APPLICATION_CREDENTIALS` apunte a donde guardaste la llave. Después:

```powershell
npm run dev
```

La API queda en http://localhost:3000. Prueba `/health`, `/api/v1/base-tecnica` y `/docs`.

| Script | Qué hace |
|---|---|
| `npm run dev` | Arranca la API con recarga automática al guardar |
| `npm run typecheck` | Revisa los tipos sin generar archivos |
| `npm run build` | Compila TypeScript a `dist/` |
| `npm start` | Ejecuta la versión compilada |

## Ejecutar con Docker

```powershell
docker build -t pi1-backend-api .

docker run --rm -p 3000:3000 --env-file .env `
  -e GOOGLE_APPLICATION_CREDENTIALS=/secrets/firebase-admin.json `
  -v "C:\secrets\pi1-salon-estudio\firebase-admin.json:/secrets/firebase-admin.json:ro" `
  pi1-backend-api
```

La llave se monta como archivo de solo lectura al ejecutar el contenedor. No se copia dentro de la imagen, así que la imagen se puede compartir sin exponerla. Cambia la ruta de `-v` por la de tu equipo.

La imagen tiene dos etapas: la primera compila TypeScript y la segunda solo lleva el código compilado y las dependencias de producción. El proceso corre con el usuario `node`, no como root.

Para levantar todos los servicios juntos usa el `docker-compose.yml` del repositorio [`infra`](https://github.com/pi1-salon-estudio/infra).

## Estructura

```
src/
  server.ts       arranca el servidor
  app.ts          arma Express: CORS, JSON, Swagger, rutas y manejo de errores
  config/         variables de entorno y conexión a Firebase
  routes/         qué URL atiende cada controlador
  controllers/    recibe la petición HTTP y responde
  services/       lógica y traducción de fallas a errores del contrato
  repositories/   único lugar que consulta Firestore
  middlewares/    sesión, perfil completo, ruta no encontrada y errores
  usuarios/       validación de los datos de registro y de perfil
  errors/         clase AppError
  utils/          utilidades, como el tiempo límite de 5 s para Firestore
docs/
  openapi.yaml    contrato de la API
firestore.rules   niega el acceso directo del navegador a Firestore
```

## Despliegue

Render construye la imagen con el `Dockerfile` de este repositorio y la despliega cada vez que se fusiona un PR a `main`. Antes de enviarle tráfico a la versión nueva revisa `/health`. El servicio está en la región Virginia, cerca de Firestore (`us-east4`).

La configuración que vive en Render y no en el repositorio:

- Variables `CORS_ORIGINS` y `GOOGLE_APPLICATION_CREDENTIALS`.
- Secret File `firebase-admin.json`.
- Health Check Path `/health`.

## Cómo contribuir

- `main` está protegida: los cambios entran por PR.
- Una rama por historia o tarea, por ejemplo `feature/TS-00-base-tecnica-api`.
- Commits con [Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/) (`feat:`, `fix:`, `docs:`, `build:`, `chore:`).
- Cada PR explica qué cambia, cómo se probó y la historia de Jira relacionada.
