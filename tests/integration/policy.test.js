const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const {
  User,
  Account,
  PolicyCategory,
  PolicyCarrier,
  Agent,
  Policy
} = require('../../src/models');

describe('Policy APIs Integration Tests', () => {
  let testUser;
  let testAccount;
  let testCategory;
  let testCarrier;
  let testAgent;

  beforeEach(async () => {
    // Seed test master entities
    testUser = await User.create({
      firstName: 'John',
      email: 'john.doe@example.com',
      phone: '1234567890',
      city: 'New York',
      state: 'NY',
      userType: 'Active Client'
    });

    testAccount = await Account.create({
      accountName: 'John Doe Account',
      accountType: 'Personal'
    });

    testCategory = await PolicyCategory.create({
      categoryName: 'Personal Auto'
    });

    testCarrier = await PolicyCarrier.create({
      companyName: 'Acme Insurance Corp'
    });

    testAgent = await Agent.create({
      agent_name: 'Agent Smith'
    });

    // Seed 2 policies for testUser
    await Policy.create([
      {
        policyNumber: 'POL-001',
        policyStartDate: new Date('2020-01-01'),
        policyEndDate: new Date('2021-01-01'),
        policyType: 'Single',
        premiumAmount: 1200.5,
        userId: testUser._id,
        accountId: testAccount._id,
        categoryId: testCategory._id,
        companyId: testCarrier._id,
        agentId: testAgent._id
      },
      {
        policyNumber: 'POL-002',
        policyStartDate: new Date('2021-02-01'),
        policyEndDate: new Date('2022-02-01'),
        policyType: 'Commercial',
        premiumAmount: 2400.0,
        userId: testUser._id,
        accountId: testAccount._id,
        categoryId: testCategory._id,
        companyId: testCarrier._id,
        agentId: testAgent._id
      }
    ]);
  });

  describe('GET /api/v1/policies/search', () => {
    it('should search policies by user email', async () => {
      const res = await request(app)
        .get('/api/v1/policies/search')
        .query({ username: 'john.doe@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('john.doe@example.com');
      expect(res.body.user.firstName).toBe('John');
      expect(res.body.policies).toHaveLength(2);
      expect(res.body.policies[0].account.name).toBe('John Doe Account');
      expect(res.body.policies[0].carrier.name).toBe('Acme Insurance Corp');
      expect(res.body.policies[0].category.name).toBe('Personal Auto');
    });

    it('should search policies by user firstName (case-insensitive)', async () => {
      const res = await request(app)
        .get('/api/v1/policies/search')
        .query({ username: 'john' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.firstName).toBe('John');
      expect(res.body.policies).toHaveLength(2);
    });

    it('should return 404 for unknown user', async () => {
      const res = await request(app)
        .get('/api/v1/policies/search')
        .query({ username: 'unknown@example.com' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 400 when username query param is missing', async () => {
      const res = await request(app).get('/api/v1/policies/search');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('BAD_REQUEST');
    });
  });

  describe('GET /api/v1/policies/summary', () => {
    it('should return aggregated policy summary grouped by user', async () => {
      // Seed a second user with 1 policy
      const secondUser = await User.create({
        firstName: 'Jane',
        email: 'jane.smith@example.com'
      });

      await Policy.create({
        policyNumber: 'POL-003',
        policyStartDate: new Date('2019-05-01'),
        policyEndDate: new Date('2020-05-01'),
        premiumAmount: 850.0,
        userId: secondUser._id,
        accountId: testAccount._id,
        categoryId: testCategory._id,
        companyId: testCarrier._id,
        agentId: testAgent._id
      });

      const res = await request(app).get('/api/v1/policies/summary');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);

      // Check first user summary (2 policies)
      const johnSummary = res.body.data.find((item) => item.email === 'john.doe@example.com');
      expect(johnSummary).toBeDefined();
      expect(johnSummary.totalPolicies).toBe(2);
      expect(johnSummary.totalPremium).toBe(3600.5);
      expect(johnSummary.categories).toContain('Personal Auto');
      expect(johnSummary.carriers).toContain('Acme Insurance Corp');
      expect(johnSummary.firstPolicyStartDate).toBe('2020-01-01');
      expect(johnSummary.lastPolicyEndDate).toBe('2022-02-01');

      // Check second user summary (1 policy)
      const janeSummary = res.body.data.find((item) => item.email === 'jane.smith@example.com');
      expect(janeSummary).toBeDefined();
      expect(janeSummary.totalPolicies).toBe(1);
      expect(janeSummary.totalPremium).toBe(850.0);
    });

    it('should support pagination query parameters limit and page', async () => {
      const res = await request(app)
        .get('/api/v1/policies/summary')
        .query({ limit: 1, page: 1 });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it('should return 400 for invalid limit or page parameters', async () => {
      const res = await request(app)
        .get('/api/v1/policies/summary')
        .query({ limit: -5 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BAD_REQUEST');
    });
  });
});
