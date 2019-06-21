import { ClientBase, Pool, PoolClient, QueryArrayResult } from 'pg';
import { Storage } from 'umzug';
import { ident } from 'pg-escape';

export interface PGStorageConfiguration {
    tableName: string;
    columnName: string;
}

const configDefaults: PGStorageConfiguration = {
    tableName: 'SchemaMigration',
    columnName: 'RevisionID'
};

export class PGStorage implements Storage {
    private readonly db: ClientBase;
    private readonly config: PGStorageConfiguration;
    private tableCreated = false;

    public constructor(db: ClientBase, partialConfig: Partial<PGStorageConfiguration> = {}) {
        this.db = db;
        this.config = Object.assign({}, partialConfig, configDefaults);
    }

    private async createTable(): Promise<void> {
        if (this.tableCreated) {
            return;
        }

        await this.db.query(`
            CREATE TABLE IF NOT EXISTS ${ident(this.config.tableName)} (
                ${ident(this.config.columnName)} TEXT NOT NULL PRIMARY KEY UNIQUE
            )
        `);
        this.tableCreated = true;
    }

    public async executed(): Promise<string[]> {
        await this.createTable();
        let result: QueryArrayResult = await this.db.query({
            text: `
                    SELECT ${ident(this.config.columnName)}
                    FROM ${ident(this.config.tableName)}
                    ORDER BY ${ident(this.config.columnName)} ASC
                `,
            rowMode: 'array'
        });

        return result.rows.flat();
    }

    public async logMigration(migrationName: string): Promise<void> {
        await this.createTable();
        await this.db.query({
            text: `
                INSERT INTO ${ident(this.config.tableName)}
                    (${ident(this.config.columnName)})
                    VALUES ($1)
                    ON CONFLICT DO NOTHING
            `,
            values: [migrationName]
        });
    }

    public async unlogMigration(migrationName: string): Promise<void> {
        await this.createTable();
        await this.db.query({
            text: `
                DELETE FROM ${ident(this.config.tableName)}
                    WHERE ${ident(this.config.columnName)} = $1
            `,
            values: [migrationName]
        });
    }
}

export async function migrateInTransaction<T>(db: Pool | ClientBase, cb: (db: ClientBase) => Promise<T>): Promise<T> {
    let conn: ClientBase | PoolClient;
    let poolClient: boolean;
    if (db instanceof Pool) {
        conn = await db.connect();
        poolClient = true;
    } else {
        conn = db;
        poolClient = false;
    }

    try {
        await conn.query('BEGIN TRANSACTION');

        let result = await cb(conn);
        await conn.query('COMMIT');
        return result;
    } catch (e) {
        await conn.query('ROLLBACK');
        throw e;
    } finally {
        if (poolClient) {
            // @ts-ignore
            conn.release();
        }
    }
}
