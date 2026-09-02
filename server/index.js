import express from 'express'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import mysql from 'mysql2/promise'
import cors from 'cors'
import dotenv from 'dotenv'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const mode = process.env.NODE_ENV === 'production' ? 'production' : 'sandbox'
dotenv.config({ path: join(__dirname, '..', mode === 'production' ? '.env.production' : '.env.sandbox') })

const app = express()
app.use(cors({ origin: '*' }))
app.use(express.json())

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  database: process.env.DB_NAME || 'writeit_sandbox',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  waitForConnections: true,
  connectionLimit: 10,
})

function serializeValue(v) {
  if (v !== null && typeof v === 'object') {
    return JSON.stringify(v)
  }
  return v
}

function serializeData(data) {
  const result = {}
  for (const [k, v] of Object.entries(data)) {
    result[k] = serializeValue(v)
  }
  return result
}

const wsClients = new Set()

function broadcast(event) {
  const msg = JSON.stringify(event)
  for (const ws of wsClients) {
    if (ws.readyState === 1) ws.send(msg)
  }
}

function parseSelect(selectStr) {
  const relations = {}
  const mainCols = []
  let remaining = selectStr

  const relRegex = /(\w+)\(([^)]+)\)/g
  let m
  while ((m = relRegex.exec(selectStr)) !== null) {
    relations[m[1]] = m[2].split(',').map(c => c.trim())
    remaining = remaining.replace(m[0], '')
  }

  for (const col of remaining.split(',')) {
    const c = col.trim().replace(/^,|,$/g, '')
    if (c) mainCols.push(c)
  }

  return { mainCols: mainCols.length ? mainCols : ['*'], relations }
}

const FK_MAP = {
  'game_sessions:session_participants': 'session_id',
  'game_sessions:requirements': 'session_id',
  'individual_sessions:requirements': 'individual_session_id',
  'individual_sessions:individual_cross_assignments': 'evaluator_session_id',
}

const BELONGS_TO_MAP = {
  'requirements:scenarios': 'scenario_id',
  'matches:scenarios': 'scenario_id',
  'game_sessions:matches': 'match_id',
}

app.get('/api/:table', async (req, res) => {
  try {
    const { table } = req.params
    const { select = '*', order, order_asc, limit, ...filters } = req.query

    const { mainCols, relations } = parseSelect(select)
    const hasRelations = Object.keys(relations).length > 0

    const selectPart = mainCols[0] === '*'
      ? `\`${table}\`.*`
      : mainCols.map(c => `\`${table}\`.\`${c}\``).join(', ')

    let query = `SELECT ${selectPart} FROM \`${table}\``
    const params = []

    const conditions = []
    for (const [key, val] of Object.entries(filters)) {
      if (key.startsWith('neq_')) {
        conditions.push(`\`${table}\`.\`${key.slice(4)}\` != ?`)
        params.push(val)
      } else if (key.startsWith('in_')) {
        const col = key.slice(3)
        const values = String(val).split(',').filter(v => v.length > 0)
        if (values.length === 0) {
          conditions.push('1 = 0')
        } else {
          const placeholders = values.map(() => '?').join(', ')
          conditions.push(`\`${table}\`.\`${col}\` IN (${placeholders})`)
          params.push(...values)
        }
      } else {
        conditions.push(`\`${table}\`.\`${key}\` = ?`)
        params.push(val)
      }
    }
    if (conditions.length) query += ` WHERE ${conditions.join(' AND ')}`

    if (order) {
      const dir = order_asc === 'false' ? 'DESC' : 'ASC'
      query += ` ORDER BY \`${table}\`.\`${order}\` ${dir}`
    }
    if (limit) query += ` LIMIT ${parseInt(limit)}`

    const [rows] = await pool.query(query, params)

    if (!hasRelations) return res.json({ data: rows, error: null })

    const result = []
    for (const row of rows) {
      const rowObj = { ...row }
      for (const [relTable, relCols] of Object.entries(relations)) {
        const relSelect = relCols[0] === '*' ? '*' : relCols.join(', ')
        const belongsToFk = BELONGS_TO_MAP[`${table}:${relTable}`]
        if (belongsToFk) {
          const [relRows] = await pool.query(
            `SELECT ${relSelect} FROM \`${relTable}\` WHERE \`id\` = ?`,
            [row[belongsToFk]]
          )
          rowObj[relTable] = relRows[0] ?? null
        } else {
          const fk = FK_MAP[`${table}:${relTable}`] || 'session_id'
          const [relRows] = await pool.query(
            `SELECT ${relSelect} FROM \`${relTable}\` WHERE \`${fk}\` = ?`,
            [row.id]
          )
          rowObj[relTable] = relRows
        }
      }
      result.push(rowObj)
    }

    res.json({ data: result, error: null })
  } catch (err) {
    console.error('[GET]', err.message)
    res.status(500).json({ data: null, error: { message: err.message } })
  }
})

app.post('/api/:table', async (req, res) => {
  try {
    const { table } = req.params
    const data = serializeData(req.body)

    if (!data.id) data.id = generateUUID()

    const keys = Object.keys(data)
    const vals = Object.values(data)
    const placeholders = keys.map(() => '?').join(', ')

    await pool.query(
      `INSERT INTO \`${table}\` (${keys.map(k => `\`${k}\``).join(', ')}) VALUES (${placeholders})`,
      vals
    )

    const [rows] = await pool.query(`SELECT * FROM \`${table}\` WHERE id = ?`, [data.id])
    const inserted = rows[0] ?? null

    broadcast({ table, eventType: 'INSERT', new: inserted })
    res.json({ data: inserted, error: null })
  } catch (err) {
    console.error('[POST]', err.message)
    res.status(500).json({ data: null, error: { message: err.message } })
  }
})

app.patch('/api/:table', async (req, res) => {
  try {
    const { table } = req.params
    const { __where, ...rest } = req.body
    const data = serializeData(rest)

    const sets = Object.keys(data).map(k => `\`${k}\` = ?`).join(', ')
    const setVals = Object.values(data)

    const whereKeys = Object.keys(__where)
    const whereVals = Object.values(__where)
    const whereClauses = whereKeys.map(k => `\`${k}\` = ?`).join(' AND ')

    await pool.query(
      `UPDATE \`${table}\` SET ${sets} WHERE ${whereClauses}`,
      [...setVals, ...whereVals]
    )

    const [rows] = await pool.query(
      `SELECT * FROM \`${table}\` WHERE ${whereClauses}`,
      whereVals
    )

    for (const row of rows) {
      broadcast({ table, eventType: 'UPDATE', new: row })
    }

    res.json({ data: rows, error: null })
  } catch (err) {
    console.error('[PATCH]', err.message)
    res.status(500).json({ data: null, error: { message: err.message } })
  }
})

// CORRIGIDO: agora aceita tanto um objeto único (req.body = {...})
// quanto um array de objetos (req.body = [{...}, {...}, ...]).
// Antes, um array era tratado como se fosse um objeto único:
// Object.keys(array) devolve os índices ("0","1","2"...) em vez
// dos nomes de coluna, gerando o erro
// "Unknown column '0' in 'field list'" ao tentar montar o INSERT.
app.put('/api/:table', async (req, res) => {
  try {
    const { table } = req.params
    const wasArray = Array.isArray(req.body)
    const items = wasArray ? req.body : [req.body]
    const upserted = []

    for (const raw of items) {
      const data = serializeData(raw)
      if (!data.id) data.id = generateUUID()

      const keys = Object.keys(data)
      const vals = Object.values(data)
      const placeholders = keys.map(() => '?').join(', ')
      const updates = keys
        .filter(k => k !== 'id')
        .map(k => `\`${k}\` = VALUES(\`${k}\`)`)
        .join(', ')

      await pool.query(
        `INSERT INTO \`${table}\` (${keys.map(k => `\`${k}\``).join(', ')}) VALUES (${placeholders})
         ON DUPLICATE KEY UPDATE ${updates}`,
        vals
      )

      const [rows] = await pool.query(`SELECT * FROM \`${table}\` WHERE id = ?`, [data.id])
      const row = rows[0] ?? null
      if (row) {
        upserted.push(row)
        broadcast({ table, eventType: 'INSERT', new: row })
      }
    }

    res.json({ data: wasArray ? upserted : (upserted[0] ?? null), error: null })
  } catch (err) {
    console.error('[PUT/upsert]', err.message)
    res.status(500).json({ data: null, error: { message: err.message } })
  }
})

app.delete('/api/:table', async (req, res) => {
  try {
    const { table } = req.params
    const filters = req.query

    const conditions = Object.keys(filters).map(k => `\`${k}\` = ?`).join(' AND ')
    const vals = Object.values(filters)

    const [rows] = await pool.query(`SELECT * FROM \`${table}\` WHERE ${conditions}`, vals)
    await pool.query(`DELETE FROM \`${table}\` WHERE ${conditions}`, vals)

    for (const row of rows) {
      broadcast({ table, eventType: 'DELETE', old: row })
    }

    res.json({ data: rows, error: null })
  } catch (err) {
    console.error('[DELETE]', err.message)
    res.status(500).json({ data: null, error: { message: err.message } })
  }
})

app.post('/api/rpc/:proc', async (req, res) => {
  try {
    const { proc } = req.params
    const args = req.body ? Object.values(req.body) : []
    const placeholders = args.map(() => '?').join(', ')

    const [result] = await pool.query(`CALL \`${proc}\`(${placeholders})`, args)
    res.json({ data: result[0] ?? null, error: null })
  } catch (err) {
    console.error('[RPC]', err.message)
    res.status(500).json({ data: null, error: { message: err.message } })
  }
})

const httpServer = createServer(app)
const wss = new WebSocketServer({ server: httpServer })

wss.on('connection', (ws) => {
  wsClients.add(ws)
  ws.on('close', () => wsClients.delete(ws))
  ws.on('error', () => wsClients.delete(ws))
})

const PORT = process.env.PORT || process.env.API_PORT || 3001
httpServer.listen(PORT, () => {
  console.log(`WriteIt API rodando na porta ${PORT} (modo: ${mode})`)
})

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}