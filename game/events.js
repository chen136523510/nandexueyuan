/**
 * 德塔（NDO）事件总线
 * Phaser <-> Vue 通信桥梁
 */
const listeners = {}

export function on(event, fn) {
  (listeners[event] || (listeners[event] = [])).push(fn)
}

export function off(event, fn) {
  const arr = listeners[event]
  if (arr) {
    const idx = arr.indexOf(fn)
    if (idx !== -1) arr.splice(idx, 1)
  }
}

export function emit(event, data) {
  const arr = listeners[event]
  if (arr) arr.forEach((fn) => fn(data))
}