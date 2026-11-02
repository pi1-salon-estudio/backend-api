import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import cors from 'cors'
import express from 'express'
import swaggerUi from 'swagger-ui-express'
import { parse } from 'yaml'
import { env } from './config/env.js'
import { errorHandler } from './middlewares/error-handler.js'
import { notFound } from './middlewares/not-found.js'
import { router } from './routes/index.js'

const contrato = parse(readFileSync(resolve('docs/openapi.yaml'), 'utf8'))

export const app = express()

app.disable('x-powered-by')
app.use(cors({ origin: env.corsOrigins }))
app.use(express.json())

app.use('/docs', swaggerUi.serve, swaggerUi.setup(contrato))
app.use(router)

app.use(notFound)
app.use(errorHandler)
