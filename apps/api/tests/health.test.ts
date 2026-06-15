import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

describe('health endpoint', () => {
  it('returns service health and confirms calculations are not implemented', async () => {
    const app = createApp();
    const response = await request(app).get('/health').expect(200);

    expect(response.body.status).toBe('ok');
    expect(response.body.service).toBe('aim-tank-integrity-api');
    expect(response.body.calculationsImplemented).toBe(false);
  });
});
