import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_FILE = process.env.DB_FILE || path.join(__dirname, 'data.sqlite');
const WASM_DIR = path.join(__dirname, 'node_modules', 'sql.js', 'dist');

const SQL = await initSqlJs({ locateFile: f => path.join(WASM_DIR, f) });

const dbBytes = fs.existsSync(DB_FILE) ? fs.readFileSync(DB_FILE) : undefined;
const db = new SQL.Database(dbBytes);

const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.run(schemaSql);

function persist(){
  const data = db.export();
  fs.writeFileSync(DB_FILE, Buffer.from(data));
}

export function all(sql, params = []){
  const stmt = db.prepare(sql); stmt.bind(params);
  const rows = []; while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free(); return rows;
}

export function get(sql, params = []){
  const rows = all(sql, params); return rows[0] || null;
}

export function run(sql, params = []){
  db.run(sql, params);
  const changes = get('SELECT changes() AS changes')?.changes ?? 0;
  persist(); return { changes };
}

export function insert(sql, params = []){
  db.run(sql, params);
  const id = get('SELECT last_insert_rowid() AS id')?.id;
  persist(); return { lastInsertRowid: id };
}
