# umzug-postgres-storage

PostgreSQL connector for umzug

Also featuring a small utility function for running migrations atomically using transactions.

    npm i @robotty/umzug-postgres-storage

```javascript
import { Pool } from 'pg';
import { PGStorage, migrateInTransaction } from 'umzug-postgres-storage';
import * as Umzug from 'umzug';
// const { Pool } = require('pg');
// const { PGStorage, migrateInTransaction } = require('umzug-postgres-storage');
// const Umzug = require('umzug');

async function runMigrations() {
    // for options, see: https://node-postgres.com/features/connecting
    let dbPool = new Pool({
        database: 'testdb',
        host: '/var/run/postgresql',
    });

    // migrateInTransaction begins and commits/rollbacks a transaction for you
    // if undesired, omit this wrapper and use:
    // let db = await dbPool.connect();

    // whatever you return from the async function inside gets returned to here
    // (note that migrateInTransaction also accepts single connections, not only pools)
    let migrations = await migrateInTransaction(dbPool, async db => {
        let umzug = new Umzug({
            storage: new PGStorage({
                db: db, // required
                tableName: "MyAppMigration", // optional (default is SchemaMigration)
                columnName: "MyAppRevisionID" // optional (default is RevisionID)
            }),
            migrations: {
                params: [db]
            }
        });
        
        return await umzug.up();
    });
}

runMigrations().catch(e => {
    console.error(e);
    process.exit(-1);
});
```
