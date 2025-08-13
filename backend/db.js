import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_FILE = process.env.DB_FILE || 'payment-tracker.db';
const dbPath = path.join(__dirname, DB_FILE);

const db = new Database(dbPath);

// Initialize schema
const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
db.exec('PRAGMA foreign_keys = ON;');
db.exec(schema);

export default db;
