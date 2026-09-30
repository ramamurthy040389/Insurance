const request = require('supertest');
const app = require('../../src/app');

describe('System and Documentation Integration Tests', () => {
  it('GET / should return root API metadata and endpoint links', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Insurance Policy Management System API');
    expect(res.body.version).toBe('1.0.0');
    expect(res.body.docs).toBe('/api-docs');
    expect(res.body.health).toBe('/health');
  });

  it('GET /health should return service health and database status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('UP');
    expect(res.body.database).toBe('UP');
    expect(res.body.timestamp).toBeDefined();
    expect(res.body.uptime).toBeDefined();
    expect(res.body.memoryUsage).toBeDefined();
  });

  it('GET /api-docs/ should serve Swagger UI HTML', async () => {
    const res = await request(app).get('/api-docs/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Swagger UI');
  });
});
