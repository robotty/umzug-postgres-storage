# umzug-postgres-storage

PostgreSQL connector for umzug

Also featuring a small utility function for running migrations atomically using transactions.

    npm i @robotty/umzug-postgres-storage

```javascript
import { Pool } from "pg";
import {
  PGStorage,
  migrateInTransaction
} from "@robotty/umzug-postgres-storage";
import * as Umzug from "umzug";
// const { Pool } = require('pg');
// const { PGStorage, migrateInTransaction } = require('@robotty/umzug-postgres-storage');
// const Umzug = require('umzug');

async function runMigrations() {
  // for options, see: https://node-postgres.com/features/connecting
  let dbPool = new Pool({
    database: "testdb",
    host: "/var/run/postgresql"
  });

  // migrateInTransaction begins and commits/rollbacks a transaction for you
  // if undesired, omit this wrapper and use:
  // let db = await dbPool.connect();

  // whatever you return from the async function inside gets returned to here
  // (note that migrateInTransaction also accepts single connections, not only pools)
  let migrations = await migrateInTransaction(dbPool, async db => {
    let umzug = new Umzug({
      // second parameter (config) is entirely optional
      storage: new PGStorage(db, {
        tableName: "my_app_migration", // optional (default is schema_migration)
        columnName: "my_app_revision_id" // optional (default is revision_id)
      }),
      migrations: {
        // passes the db connection to use to the first parameter of all the up()/down() migrations
        // you defined for umzug to run
        params: [db]
      }
    });

    return await umzug.up();
  });

  console.log("Successfully ran these migrations:", migrations);
}

runMigrations().catch(e => {
  console.error(e);
  process.exitCode = 1;
});
```
