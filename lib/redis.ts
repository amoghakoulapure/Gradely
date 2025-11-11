import IORedis from "ioredis"

let singleton: IORedis | null = null
export function getRedis() {
  if (singleton) return singleton
  const url = process.env.REDIS_URL || "redis://localhost:6379"
  singleton = new IORedis(url)
  return singleton
}

export function getNewRedis() {
  const url = process.env.REDIS_URL || "redis://localhost:6379"
  return new IORedis(url)
}
