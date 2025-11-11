import { Queue } from "bullmq"
import { getNewRedis } from "./redis"

let q: Queue | null = null
export function getQueue() {
  if (q) return q
  // BullMQ can accept connection options; we pass an ioredis instance
  q = new Queue("grade", { connection: getNewRedis() as any })
  return q
}
