/**
 * Executor de migrations MySQL para WriteIt
 *
 * Uso:
 *   node mysql/migrate.js --env=sandbox      (usa .env.sandbox)
 *   node mysql/migrate.js --env=production   (usa .env.production)
 *
 * Dependências: npm install mysql2 dotenv
 */

import { createConnection } from 'mysql2/promise';
import { config } from 'dotenv';
import { readFileSync, readdirSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Carrega o arquivo .env correto
const envArg = process.argv.find(a => a.startsWith('--env='));
const envMode = envArg ? envArg.split('=')[1] : 'sandbox';
config({ path: resolve(process.cwd(), `.env.${envMode}`) });

const dbConfig = {
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '3306', 10),
  database: process.env.DB_NAME     || 'writeit_sandbox',
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true,
};

/**
 * Remove linhas de comentário do início de um bloco SQL
 * e retorna o statement limpo.
 */
function stripLeadingComments(text) {
  return text
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n')
    .trim()
}

/**
 * Divide o SQL em statements individuais.
 * Lida com blocos DELIMITER $$ (triggers e procedures).
 */
function splitStatements(sql) {
  const statements = [];
  let delimiter = ';';
  let block = [];
  let inSpecialBlock = false;

  for (const rawLine of sql.split('\n')) {
    const trimmed = rawLine.trim();

    // Ignora comentários fora de blocos especiais
    if (!inSpecialBlock && trimmed.startsWith('--')) continue;

    // Detecta DELIMITER
    const delimMatch = trimmed.match(/^DELIMITER\s+(\S+)$/i);
    if (delimMatch) {
      const newDelim = delimMatch[1];
      if (newDelim === ';') {
        inSpecialBlock = false;
        delimiter = ';';
      } else {
        inSpecialBlock = true;
        delimiter = newDelim;
        block = [];
      }
      continue;
    }

    if (inSpecialBlock) {
      if (trimmed.endsWith(delimiter)) {
        const withoutDelim = rawLine.slice(0, rawLine.lastIndexOf(delimiter));
        block.push(withoutDelim);
        const stmt = block.join('\n').trim();
        if (stmt) statements.push(stmt);
        block = [];
      } else {
        block.push(rawLine);
      }
    } else {
      block.push(rawLine);
      if (trimmed.endsWith(';')) {
        const raw = block.join('\n').trim();
        const stmt = stripLeadingComments(raw).replace(/;$/, '').trim();
        if (stmt.length > 2) statements.push(stmt);
        block = [];
      }
    }
  }

  return statements;
}

async function runMigrations() {
  console.log(`\nAmbiente: ${envMode}`);
  console.log(`Banco:     ${dbConfig.database} @ ${dbConfig.host}:${dbConfig.port}\n`);

  const conn = await createConnection({ ...dbConfig, database: undefined });

  // Cria o banco se não existir
  await conn.query(
    `CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await conn.query(`USE \`${dbConfig.database}\``);

  // Tabela de controle de migrations
  await conn.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      filename    VARCHAR(255) NOT NULL UNIQUE,
      executed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const migrationsDir = join(__dirname, 'migrations');
  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  let ran = 0;

  for (const file of files) {
    const [rows] = await conn.query(
      'SELECT id FROM _migrations WHERE filename = ?',
      [file]
    );

    if (rows.length > 0) {
      console.log(`  ↩  ${file} (já executado)`);
      continue;
    }

    console.log(`  ▶  ${file}`);
    const sql = readFileSync(join(migrationsDir, file), 'utf-8');
    const statements = splitStatements(sql);

    for (const stmt of statements) {
      try {
        await conn.query(stmt);
      } catch (err) {
        // Ignora erros de objetos já existentes
        if (!err.message.includes('already exists') && !err.message.includes('Duplicate')) {
          throw err;
        }
      }
    }

    await conn.query('INSERT INTO _migrations (filename) VALUES (?)', [file]);
    console.log(`  ✓  ${file}`);
    ran++;
  }

  await conn.end();

  console.log(`\n${ran === 0 ? 'Nenhuma migration nova.' : `${ran} migration(s) executada(s) com sucesso.`}\n`);
}

runMigrations().catch(err => {
  console.error('\nErro na migration:', err.message);
  process.exit(1);
});
