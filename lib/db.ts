import { Pool, PoolClient, QueryResult } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://ratelimiter:ratelimiter123@localhost:5432/ratelimiter',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle database client', err);
    });
  }

  return pool;
}

export async function query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
  const pool = getPool();
  return pool.query<T>(text, params);
}

export async function getClient(): Promise<PoolClient> {
  const pool = getPool();
  return pool.connect();
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

// Database types
export interface Tenant {
  id: string;
  name: string;
  created_at: Date;
}

export type RuleType = 'GENERAL' | 'IP' | 'API';

export interface RateLimitRule {
  id: string;
  tenant_id: string;
  rule_type: RuleType;
  limit: number;
  window_seconds: number;
  api_pattern: string | null;
  created_at: Date;
}

export interface TenantWithRules extends Tenant {
  rules: RateLimitRule[];
}

