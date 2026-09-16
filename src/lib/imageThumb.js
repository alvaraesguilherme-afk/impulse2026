// Pede uma versao redimensionada da foto via Supabase Storage Image
// Transformation (endpoint /render/image/, exige plano Pro+) em vez da
// foto no tamanho de upload inteiro so pra mostrar um card pequeno no
// grid do Mural. A qualidade do arquivo original enviado NAO muda —
// isso so afeta o que e baixado pra exibir a miniatura; abrir a foto
// (lightbox) continua usando a url original, sem transformacao.
export function thumbUrl(url, { width, height } = {}) {
  if (!url) return url
  const marker = '/storage/v1/object/public/'
  const i = url.indexOf(marker)
  if (i === -1) return url
  const path = url.slice(i + marker.length)
  const base = url.slice(0, i)
  const params = new URLSearchParams({ width: String(width || 480) })
  if (height) { params.set('height', String(height)); params.set('resize', 'cover') }
  return `${base}/storage/v1/render/image/public/${path}?${params.toString()}`
}

// Handler de <img onError>: se a transformacao falhar (plano sem
// image transformation habilitado, etc.) cai pra url original sem
// quebrar a foto.
export function onThumbError(originalUrl) {
  return (e) => {
    if (e.currentTarget.src !== originalUrl) e.currentTarget.src = originalUrl
  }
}
