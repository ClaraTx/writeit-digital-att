const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3001'
const WS_URL  = API_URL.replace(/^http/, 'ws')

// ── WebSocket singleton ───────────────────────────────────────
type ChangeCallback = (payload: { eventType: string; new: Record<string, unknown>; old?: Record<string, unknown> }) => void

interface Subscription {
  event: string
  table: string
  filter?: string
  callback: ChangeCallback
}

let socket: WebSocket | null = null
let subscribers: Subscription[] = []
let reconnectTimer: ReturnType<typeof setTimeout> | null = null

function getSocket(): WebSocket {
  if (socket && socket.readyState <= 1) return socket

  socket = new WebSocket(WS_URL)

  socket.onmessage = (ev) => {
    let msg: { table: string; eventType: string; new?: Record<string, unknown>; old?: Record<string, unknown> }
    try { msg = JSON.parse(ev.data) } catch { return }

    for (const sub of subscribers) {
      if (sub.table !== msg.table) continue
      if (sub.event !== '*' && sub.event !== msg.eventType) continue

      if (sub.filter) {
        // Format: "col=eq.value"
        const eqMatch = sub.filter.match(/^(\w+)=eq\.(.+)$/)
        if (eqMatch) {
          const [, col, val] = eqMatch
          const row = msg.new ?? msg.old ?? {}
          if (String(row[col]) !== val) continue
        }
      }

      sub.callback({ eventType: msg.eventType, new: msg.new ?? {}, old: msg.old })
    }
  }

  socket.onclose = () => {
    socket = null
    if (subscribers.length > 0) {
      reconnectTimer = setTimeout(() => getSocket(), 3000)
    }
  }

  socket.onerror = () => { socket?.close() }

  return socket
}

const ISO_DATETIME_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function toMySQLDateTime(value: string): string {
  const date = new Date(value)
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())
  const seconds = pad(date.getSeconds())
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

function normalizeDatesInPayload<T extends Record<string, unknown>>(payload: T): T {
  const normalized: Record<string, unknown> = { ...payload }
  for (const [key, value] of Object.entries(normalized)) {
    if (typeof value === 'string' && ISO_DATETIME_REGEX.test(value)) {
      normalized[key] = toMySQLDateTime(value)
    }
  }
  return normalized as T
}

// ── Query Builder ─────────────────────────────────────────────
type Operation = 'select' | 'insert' | 'update' | 'delete' | 'upsert'

class QueryBuilder {
  private _table: string
  private _op: Operation = 'select'
  private _select = '*'
  private _filters: Record<string, unknown> = {}
  private _neqFilters: Record<string, unknown> = {}
  private _inFilters: Record<string, unknown[]> = {}
  private _updateWhere: Record<string, unknown> = {}
  private _order: string | null = null
  private _orderAsc = true
  private _limit: number | null = null
  private _single = false
  private _data: Record<string, unknown> | Record<string, unknown>[] | null = null
  private _returnData = false

  constructor(table: string) { this._table = table }

  select(cols = '*') {
    if (this._op === 'insert' || this._op === 'update') {
      this._returnData = true
      return this
    }
    this._select = cols
    this._op = 'select'
    return this
  }

  insert(data: Record<string, unknown>) {
    this._data = normalizeDatesInPayload(data)
    this._op = 'insert'
    return this
  }

  update(data: Record<string, unknown>) {
    this._data = normalizeDatesInPayload(data)
    this._op = 'update'
    return this
  }

  delete() { this._op = 'delete'; return this }

  
  upsert(data: Record<string, unknown> | Record<string, unknown>[]) {
    this._data = Array.isArray(data)
      ? data.map(d => normalizeDatesInPayload(d))
      : normalizeDatesInPayload(data)
    this._op = 'upsert' as Operation
    return this
  }

  eq(col: string, val: unknown) {
    if (this._op === 'update') this._updateWhere[col] = val
    else this._filters[col] = val
    return this
  }

  neq(col: string, val: unknown) { this._neqFilters[col] = val; return this }

  in(col: string, vals: unknown[]) { this._inFilters[col] = vals; return this }

  order(col: string, opts?: { ascending?: boolean }) {
    this._order = col
    this._orderAsc = opts?.ascending !== false
    return this
  }

  limit(n: number) { this._limit = n; return this }
  single() { this._single = true; return this }

  // PromiseLike — allows `await supabase.from(...).select()...`
  then<T>(resolve: (val: T) => void, reject?: (reason: unknown) => void): Promise<T> {
    return this._run().then(resolve as (val: unknown) => T, reject) as Promise<T>
  }

  private async _run(): Promise<{ data: unknown; error: unknown }> {
    try {
      if (this._op === 'select') return await this._execSelect()
      if (this._op === 'insert') return await this._execInsert()
      if (this._op === 'update') return await this._execUpdate()
      if (this._op === 'delete') return await this._execDelete()
      if (this._op === 'upsert') return await this._execUpsert()
      throw new Error('Unknown operation')
    } catch (err) {
      return { data: null, error: { message: (err as Error).message } }
    }
  }

  private async _execSelect() {
    const params = new URLSearchParams()
    if (this._select !== '*') params.set('select', this._select)
    for (const [k, v] of Object.entries(this._filters)) params.set(k, String(v))
    for (const [k, v] of Object.entries(this._neqFilters)) params.set(`neq_${k}`, String(v))
    for (const [k, v] of Object.entries(this._inFilters)) params.set(`in_${k}`, v.join(','))
    if (this._order) { params.set('order', this._order); params.set('order_asc', String(this._orderAsc)) }
    if (this._limit) params.set('limit', String(this._limit))

    const res = await fetch(`${API_URL}/api/${this._table}?${params}`)
    const json = await res.json()
    if (this._single) return { data: (json.data as unknown[])?.[0] ?? null, error: json.error }
    return json
  }

  private async _execInsert() {
    const data = this._data as Record<string, unknown>
    if (!data.id) data.id = crypto.randomUUID()
    const res = await fetch(`${API_URL}/api/${this._table}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (this._single) return { data: json.data ?? null, error: json.error }
    return json
  }

  private async _execUpdate() {
    const res = await fetch(`${API_URL}/api/${this._table}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ __where: this._updateWhere, ...(this._data as Record<string, unknown>) }),
    })
    return res.json()
  }

  private async _execUpsert() {
    const isArray = Array.isArray(this._data)
    const items = (isArray ? this._data : [this._data]) as Record<string, unknown>[]
    const withIds = items.map(d => ({ ...d, id: d.id ?? crypto.randomUUID() }))

    const res = await fetch(`${API_URL}/api/${this._table}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(isArray ? withIds : withIds[0]),
    })
    return res.json()
  }

  private async _execDelete() {
    const params = new URLSearchParams(
      Object.fromEntries(Object.entries(this._filters).map(([k, v]) => [k, String(v)]))
    )
    const res = await fetch(`${API_URL}/api/${this._table}?${params}`, { method: 'DELETE' })
    return res.json()
  }
}

// ── Channel (real-time) ───────────────────────────────────────
class Channel {
  private _subs: Subscription[] = []

  on(
    _type: string,
    config: { event: string; schema: string; table: string; filter?: string },
    callback: ChangeCallback
  ) {
    const sub: Subscription = { event: config.event, table: config.table, filter: config.filter, callback }
    this._subs.push(sub)
    subscribers.push(sub)
    getSocket()
    return this
  }

  subscribe() { return this }

  close() {
    subscribers = subscribers.filter(s => !this._subs.includes(s))
    this._subs = []
    if (subscribers.length === 0 && reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }
}

// ── Public API (drop-in replacement for Supabase client) ──────
export const supabase = {
  from: (table: string) => new QueryBuilder(table),
  channel: (name: string) => new Channel(),
  removeChannel: (channel: Channel) => channel.close(),
  rpc: async (proc: string, args: Record<string, unknown> = {}) => {
    try {
      const res = await fetch(`${API_URL}/api/rpc/${proc}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args),
      })
      return res.json()
    } catch (err) {
      return { data: null, error: { message: (err as Error).message } }
    }
  },
}