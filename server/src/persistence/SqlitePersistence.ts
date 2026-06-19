import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname } from 'path';
import { Logger } from '../logging/Logger';
import { PersistedWorldSnapshot } from '../state/stateTypes';
import { PersistenceAdapter } from './PersistenceAdapter';

export class SqlitePersistence implements PersistenceAdapter {
  private db: Database.Database | null = null;

  constructor(
    private readonly dbPath: string,
    private readonly logger: Logger,
  ) {}

  async initialize(): Promise<void> {
    mkdirSync(dirname(this.dbPath), { recursive: true });
    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS world_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lobby_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        saved_at INTEGER NOT NULL,
        state_json TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_snapshots_lobby_saved
        ON world_snapshots (lobby_id, saved_at DESC);
    `);
    this.logger.info('SQLite-Persistenz initialisiert', { dbPath: this.dbPath });
  }

  async saveSnapshot(snapshot: PersistedWorldSnapshot): Promise<void> {
    const db = this.requireDb();
    const stmt = db.prepare(`
      INSERT INTO world_snapshots (lobby_id, version, saved_at, state_json)
      VALUES (@lobbyId, @version, @savedAt, @stateJson)
    `);

    stmt.run({
      lobbyId: snapshot.lobbyId,
      version: snapshot.version,
      savedAt: snapshot.savedAt,
      stateJson: JSON.stringify(snapshot),
    });
  }

  async loadLatestSnapshot(lobbyId: string): Promise<PersistedWorldSnapshot | null> {
    const db = this.requireDb();
    const row = db.prepare(`
      SELECT state_json AS stateJson
      FROM world_snapshots
      WHERE lobby_id = ?
      ORDER BY saved_at DESC
      LIMIT 1
    `).get(lobbyId) as { stateJson: string } | undefined;

    if (!row) {
      return null;
    }

    return JSON.parse(row.stateJson) as PersistedWorldSnapshot;
  }

  async close(): Promise<void> {
    this.db?.close();
    this.db = null;
  }

  private requireDb(): Database.Database {
    if (!this.db) {
      throw new Error('SQLite-Datenbank ist nicht initialisiert.');
    }
    return this.db;
  }
}
