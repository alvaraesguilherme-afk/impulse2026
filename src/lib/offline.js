'use client'

import * as home from '@/app/actions/home'
import * as supervisor from '@/app/actions/supervisor'
import * as apoio from '@/app/actions/apoio'
import * as midia from '@/app/actions/midia'
import * as programacao from '@/app/actions/programacao'
import * as advertencias from '@/app/actions/advertencias'
import * as mural from '@/app/actions/mural'
import * as config from '@/app/actions/config'

// Fila offline: no evento o sinal é ruim. Se a ação não chega no servidor
// (sem rede), ela fica guardada no aparelho e é reenviada quando a conexão
// volta — igual ao syncOp do app antigo, mas passando pelas server actions
// (que conferem a permissão de quem está logado) em vez de gravar direto.
const ACOES = { home, supervisor, apoio, midia, programacao, advertencias, mural, config }
const QUEUE_KEY = 'impulse_fila_acoes'

function resolver(nome) {
  const [mod, fn] = nome.split('.')
  return ACOES[mod]?.[fn]
}

function getFila() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY)) || [] } catch { return [] }
}

function salvarFila(fila) {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(fila)) } catch { /* cheio */ }
  window.dispatchEvent(new Event('impulse-fila'))
}

const ehErroDeRede = e => !navigator.onLine || e instanceof TypeError

// nome no formato "modulo.funcao", ex.: "supervisor.marcarChamada"
export async function executar(nome, ...args) {
  const acao = resolver(nome)
  try {
    if (!navigator.onLine) throw new TypeError('offline')
    const resultado = await acao(...args)
    return { ok: true, resultado }
  } catch (e) {
    if (!ehErroDeRede(e)) return { ok: false, erro: true }
    salvarFila([...getFila(), { nome, args, ts: Date.now() }])
    return { ok: false, pendente: true }
  }
}

let processando = false

export async function processarFila() {
  if (processando || !navigator.onLine) return 0
  processando = true
  try {
    const fila = getFila()
    if (fila.length === 0) return 0
    const restantes = []
    for (const op of fila) {
      try { await resolver(op.nome)?.(...op.args) }
      catch (e) { if (ehErroDeRede(e)) restantes.push(op) }
    }
    salvarFila(restantes)
    return fila.length - restantes.length
  } finally {
    processando = false
  }
}

export function pendentes() {
  return getFila().length
}
