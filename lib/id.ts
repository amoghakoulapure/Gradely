const HEX = Array.from({ length: 256 }, (_, i) => (i + 0x100).toString(16).slice(1))

function randomBytes(count: number): Uint8Array {
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    const arr = new Uint8Array(count)
    globalThis.crypto.getRandomValues(arr)
    return arr
  }
  const arr = new Uint8Array(count)
  for (let i = 0; i < count; i++) {
    arr[i] = Math.floor(Math.random() * 256)
  }
  return arr
}

export function getUUID(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID()
  }
  const rnds = randomBytes(16)
  rnds[6] = (rnds[6] & 0x0f) | 0x40
  rnds[8] = (rnds[8] & 0x3f) | 0x80
  let str = ""
  for (let i = 0; i < 16; i++) {
    str += HEX[rnds[i]]
    if (i === 3 || i === 5 || i === 7 || i === 9) str += "-"
  }
  return str
}
