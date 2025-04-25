/**
 * This is an alternative to a real DB migration setup. So all
 * queries must be idempotent, or your app will crash on
 * start.
 *
 * If there were a real app, we would want a migration
 * setup.
 */
import { getEnv } from './env'
import pg from 'pg'

let globalPool: pg.Pool
export async function getPgClient() {
        if (!globalPool) {
                globalPool = new pg.Pool({
                        connectionString: getEnv().POSTGRES_URL,
                })
        }
        return await globalPool.connect()
}

export async function initDb(client: pg.Client | pg.PoolClient) {
        await client.query(`
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
  `)
        await client.query(`
    CREATE TABLE IF NOT EXISTS app_users (
      id          UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY
    );
  `)
        await client.query(`
    ALTER TABLE app_users
      ADD COLUMN IF NOT EXISTS access_key TEXT;
    `)
        await client.query(`
    ALTER TABLE app_users
      ADD COLUMN IF NOT EXISTS github_username TEXT;
    `)
        await client.query(`
      ALTER TABLE app_users
        ADD COLUMN IF NOT EXISTS github_displayname TEXT;
      `)
        await client.query(`
        ALTER TABLE app_users
          ADD COLUMN IF NOT EXISTS github_avatar TEXT;
        `)
        await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'app_users_github_username_key'
      ) THEN
        ALTER TABLE app_users ADD CONSTRAINT app_users_github_username_key UNIQUE (github_username);
      END IF;
    END $$;
    `)
        await client.query(`
      CREATE TABLE IF NOT EXISTS repos (
        id                    UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
        created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        github_id             int NOT NULL UNIQUE,
        owner                 TEXT NOT NULL,
        repo_name             TEXT NOT NULL
      );
      `)
        await client.query(`
        DO $$
         BEGIN
           IF NOT EXISTS (
             SELECT 1 FROM pg_constraint
             WHERE conname = 'repos_unique_owner_repo'
           ) THEN
             ALTER TABLE repos ADD CONSTRAINT repos_unique_owner_repo UNIQUE (owner, repo_name);
           END IF;
         END $$;
       `)
        await client.query(`
      CREATE TABLE IF NOT EXISTS github_releases (
        id                    UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
        github_id             int NOT NULL,
        repo_id               UUID NOT NULL,
        release_created_at    TIMESTAMP WITH TIME ZONE NOT NULL,
        tag_name              TEXT NOT NULL,
        name                  TEXT NOT NULL,
        prerelease            BOOLEAN NOT NULL,
        created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      `)
        await client.query(`
       DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'github_releases_tag_repo_key'
          ) THEN
            ALTER TABLE github_releases ADD CONSTRAINT github_releases_tag_repo_key UNIQUE (repo_id, github_id);
          END IF;
        END $$;

      `)

        await client.query(`
        DO $$
         BEGIN
           IF NOT EXISTS (
             SELECT 1 FROM pg_constraint
             WHERE conname = 'github_releases_repo_fkey'
           ) THEN
             ALTER TABLE github_releases ADD CONSTRAINT github_releases_repo_fkey FOREIGN KEY (repo_id) REFERENCES repos(id);
           END IF;
         END $$;
       `)
        await client.query(`
    ALTER TABLE github_releases
      ADD COLUMN IF NOT EXISTS body TEXT NOT NULL;
    ALTER TABLE github_releases
      ADD COLUMN IF NOT EXISTS url TEXT NOT NULL;
    `)
        await client.query(`
    ALTER TABLE repos
      ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    ALTER TABLE github_releases
      ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    `)

        // Create a trigger function to update last_updated column
        await client.query(`
    CREATE OR REPLACE FUNCTION update_last_updated()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.last_updated = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `)

        // Add triggers to tables
        await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_repos_last_updated'
      ) THEN
        CREATE TRIGGER update_repos_last_updated
        BEFORE UPDATE ON repos
        FOR EACH ROW
        EXECUTE FUNCTION update_last_updated();
      END IF;
    END $$;
  `)

        await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_github_releases_last_updated'
      ) THEN
        CREATE TRIGGER update_github_releases_last_updated
        BEFORE UPDATE ON github_releases
        FOR EACH ROW
        EXECUTE FUNCTION update_last_updated();
      END IF;
    END $$;
  `)

        // Create indexes if they don't exist
        await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_repos_owner_repo_name'
      ) THEN
        CREATE INDEX idx_repos_owner_repo_name ON repos(owner, repo_name);
      END IF;
    END $$;
  `)

        await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_github_releases_repo_id'
      ) THEN
        CREATE INDEX idx_github_releases_repo_id ON github_releases(repo_id);
      END IF;
    END $$;
  `)

        await client.query(`
    CREATE TABLE IF NOT EXISTS app_user_repo_subscriptions (
      id              UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
      app_user_id     UUID NOT NULL REFERENCES app_users(id),
      repo_id         UUID NOT NULL REFERENCES repos(id),
      has_updated     BOOLEAN DEFAULT false
    );
    `)

        await client.query(`
      DO $$
       BEGIN
         IF NOT EXISTS (
           SELECT 1 FROM pg_constraint
           WHERE conname = 'app_user_repo_subscriptions_unique_user_repo'
         ) THEN
           ALTER TABLE app_user_repo_subscriptions ADD CONSTRAINT app_user_repo_subscriptions_unique_user_repo UNIQUE (app_user_id, repo_id);
         END IF;
       END $$;
     `)
        await client.query(`
      ALTER TABLE app_user_repo_subscriptions
        ADD COLUMN IF NOT EXISTS last_release TIMESTAMP WITH TIME ZONE DEFAULT '1970-01-01 00:00:00 UTC'::timestamp with time zone;
      `)

        await client.query(`
      ALTER TABLE app_users
        ADD COLUMN IF NOT EXISTS email TEXT
      `)
        await client.query(`
      ALTER TABLE repos
        ADD COLUMN IF NOT EXISTS last_release_check TIMESTAMP WITH TIME ZONE DEFAULT '1970-01-01 00:00:00 UTC'::timestamp with time zone;
  `)
}
