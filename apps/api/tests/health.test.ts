import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import * as dbClient from '../src/db/client.js';

vi.mock('../src/db/client.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/db/client.js')>();
  return {
    ...actual,
    checkDatabaseConnection: vi.fn()
  };
});

function responseText(body: unknown): string {
  return JSON.stringify(body).toLowerCase();
}

function expectNoSensitiveHealthDetails(body: unknown): void {
  const text = responseText(body);
  for (const forbidden of [
    'postgresql://',
    'database_url',
    'connectionstring',
    'connection string',
    'password',
    'secret',
    'token',
    'credential',
    'stack',
    'node_modules',
    'db.internal',
    'rds.amazonaws.com',
    '5432',
    'aim_password',
    'at object.',
    'at process.'
  ]) {
    expect(text, `health response must not expose ${forbidden}`).not.toContain(forbidden);
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('health endpoints', () => {
  it('GET /health returns safe API status without secrets', async () => {
    await request(createApp())
      .get('/health')
      .expect(200)
      .expect((res) => {
        expect(res.body).toMatchObject({
          status: 'ok',
          service: 'aim-tank-integrity-api',
          sprint: 'foundation'
        });
        expectNoSensitiveHealthDetails(res.body);
      });
  });

  it('GET /health/db verifies database connectivity safely when available', async () => {
    vi.mocked(dbClient.checkDatabaseConnection).mockResolvedValue({
      ok: true,
      serverTime: '2026-06-28 00:54:54+07'
    });

    await request(createApp())
      .get('/health/db')
      .expect(200)
      .expect((res) => {
        expect(res.body).toMatchObject({
          status: 'ok',
          database: { ok: true }
        });
        expectNoSensitiveHealthDetails(res.body);
      });
  });

  it('GET /health/db redacts database failure details', async () => {
    vi.mocked(dbClient.checkDatabaseConnection).mockResolvedValue({
      ok: false,
      error:
        'password=aim_password postgresql://aim_user:aim_password@db.internal:5432/aim_tank_integrity stack at Object.<anonymous> node_modules/pg/lib/client.js'
    });

    await request(createApp())
      .get('/health/db')
      .expect(503)
      .expect((res) => {
        expect(res.body).toEqual({
          status: 'error',
          database: {
            ok: false,
            error: 'Database connectivity check failed.'
          }
        });
        expectNoSensitiveHealthDetails(res.body);
      });
  });
});
