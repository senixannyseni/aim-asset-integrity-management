import { describe, expect, it } from 'vitest';
import { checkDatabaseConnection } from '../src/db/client.js';

describe('database connectivity', () => {
  it('connects to PostgreSQL when local database is available', async () => {
    const result = await checkDatabaseConnection();
    expect(result.ok).toBe(true);
    expect(result.serverTime).toBeTruthy();
  });
});
