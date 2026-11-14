// Minimal IndexedDB wrapper: 'kv' (JSON state, config) and 'files' (document blobs)
const NAME = 'fellowtrack', VER = 1
let dbp: Promise<IDBDatabase> | null = null
function open(): Promise<IDBDatabase> {
  if (!dbp) dbp = new Promise((res, rej) => {
    const rq = indexedDB.open(NAME, VER)
    rq.onupgradeneeded = () => { const d = rq.result; d.createObjectStore('kv'); d.createObjectStore('files') }
    rq.onsuccess = () => res(rq.result)
    rq.onerror = () => rej(rq.error)
  })
  return dbp
}
function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(d => new Promise<T>((res, rej) => {
    const t = d.transaction(store, mode); const rq = fn(t.objectStore(store))
    t.oncomplete = () => res(rq.result); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error)
  }))
}
export const kvGet = <T,>(k: string) => tx<T | undefined>('kv', 'readonly', s => s.get(k))
export const kvSet = (k: string, v: unknown) => tx('kv', 'readwrite', s => s.put(v, k))
export const fileGet = (k: string) => tx<Blob | undefined>('files', 'readonly', s => s.get(k))
export const fileSet = (k: string, b: Blob) => tx('files', 'readwrite', s => s.put(b, k))
export const fileDel = (k: string) => tx('files', 'readwrite', s => s.delete(k))
export const fileKeys = () => tx<IDBValidKey[]>('files', 'readonly', s => s.getAllKeys())
export async function wipeAll() { await tx('kv', 'readwrite', s => s.clear()); await tx('files', 'readwrite', s => s.clear()) }
