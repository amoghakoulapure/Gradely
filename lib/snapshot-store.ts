import { getUUID } from "./id"

export type SnapshotRow = {
  id: string
  user: string
  language: string
  code: string
  created_at: string
}

const STORE_KEY = Symbol.for("gradely.snapshotStore")

function seedSnapshots(): SnapshotRow[] {
  const now = new Date()
  return [
    {
      id: getUUID(),
      user: "demo@gradely.test",
      language: "typescript",
      code: `function greet(name: string) {
  return "Hello, ${name}!"
}

greet("Gradely")`,
      created_at: new Date(now.getTime() - 1000 * 60 * 60).toISOString(),
    },
    {
      id: getUUID(),
      user: "demo@gradely.test",
      language: "python",
      code: "print('Gradely makes reviews easy!')",
      created_at: new Date(now.getTime() - 1000 * 60 * 30).toISOString(),
    },
  ]
}

type SnapshotStoreGlobal = typeof globalThis & {
  [STORE_KEY]?: SnapshotRow[]
}

function getStore(): SnapshotRow[] {
  const globalObject = globalThis as SnapshotStoreGlobal
  if (!globalObject[STORE_KEY]) {
    globalObject[STORE_KEY] = seedSnapshots()
  }
  return globalObject[STORE_KEY]!
}

export function listSnapshotsFallback(user: string): SnapshotRow[] {
  return getStore()
    .filter((snap) => snap.user === user)
    .sort((a, b) => (a.created_at > b.created_at ? -1 : 1))
}

export function saveSnapshotFallback(row: SnapshotRow): SnapshotRow {
  const store = getStore()
  store.unshift(row)
  if (store.length > 200) {
    store.pop()
  }
  return row
}
