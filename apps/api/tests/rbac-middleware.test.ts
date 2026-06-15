import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

describe('RBAC middleware', () => {
  it('rejects protected route without auth context', async () => {
    const app = createApp();
    const response = await request(app).get('/api/v1/rbac/demo/asset-read').expect(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('allows role with required permission', async () => {
    const app = createApp();
    await request(app)
      .get('/api/v1/rbac/demo/asset-read')
      .set('x-aim-demo-roles', 'client_viewer')
      .expect(200);
  });

  it('blocks ai_agent from calculation approval', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/api/v1/rbac/demo/calculation-approve')
      .set('x-aim-demo-roles', 'ai_agent')
      .expect(403);

    expect(response.body.error.code).toBe('FORBIDDEN');
  });
});
