// Si Firestore no responde, la petición no debe quedarse colgada:
// pasado el límite se rechaza y el servicio responde 503.
export function conTiempoLimite<T>(promesa: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const temporizador = setTimeout(
      () => reject(new Error(`Tiempo de espera agotado (${ms} ms)`)),
      ms,
    )
    promesa.then(
      (valor) => {
        clearTimeout(temporizador)
        resolve(valor)
      },
      (error) => {
        clearTimeout(temporizador)
        reject(error)
      },
    )
  })
}
