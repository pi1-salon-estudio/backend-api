// Lee y normaliza la configuración desde variables de entorno.
// Ninguna credencial vive en el código: todo llega por el entorno.
export const env = {
  port: Number(process.env.PORT ?? 3000),
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((origen) => origen.trim())
    .filter(Boolean),
}
