import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { AppError } from '../errors/app-error.js'
import { esIdValido, leerSalaNueva } from './validar.js'

describe('leerSalaNueva', () => {
  it('recorta el nombre', () => {
    assert.deepEqual(leerSalaNueva({ nombre: '  Cálculo II  ' }), { nombre: 'Cálculo II' })
  })

  it('rechaza un nombre vacío o de solo espacios', () => {
    assert.throws(() => leerSalaNueva({ nombre: '   ' }), (error: unknown) => error instanceof AppError && error.status === 400)
  })

  it('rechaza un nombre de más de 60 caracteres', () => {
    assert.throws(() => leerSalaNueva({ nombre: 'a'.repeat(61) }), (error: unknown) => error instanceof AppError && error.status === 400)
  })
})

describe('esIdValido', () => {
  it('rechaza una barra, un punto y el vacío', () => {
    assert.equal(esIdValido('sala/uno'), false)
    assert.equal(esIdValido('.'), false)
    assert.equal(esIdValido(''), false)
    assert.equal(esIdValido('7Qk2mXrB9tLwN4pZs1Ha'), true)
  })
})
