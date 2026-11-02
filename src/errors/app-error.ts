// Error controlado de la aplicación. El manejador central lo convierte en
// la respuesta { error: { codigo, mensaje } } que define el contrato.
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly codigo: string,
    mensaje: string,
    options?: { cause?: unknown },
  ) {
    super(mensaje, options)
    this.name = 'AppError'
  }
}
