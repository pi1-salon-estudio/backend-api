// Error controlado de la aplicación. El manejador central lo convierte en
// la respuesta { error: { codigo, mensaje } } que define el contrato.
export class AppError extends Error {
  readonly campos?: Record<string, string>

  constructor(
    public readonly status: number,
    public readonly codigo: string,
    mensaje: string,
    options?: { cause?: unknown; campos?: Record<string, string> },
  ) {
    super(mensaje, options?.cause === undefined ? undefined : { cause: options.cause })
    this.name = 'AppError'
    this.campos = options?.campos
  }
}
