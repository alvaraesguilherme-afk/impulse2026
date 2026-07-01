export function getDeviceId() {
  let id = localStorage.getItem('impulse_device_id')
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36)
    localStorage.setItem('impulse_device_id', id)
  }
  return id
}
