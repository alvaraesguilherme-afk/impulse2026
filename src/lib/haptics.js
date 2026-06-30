export function vibrar(ms = 8) {
  if (navigator.vibrate) navigator.vibrate(ms)
}
