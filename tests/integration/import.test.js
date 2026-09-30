const request = require('supertest');
const path = require('path');
const fs = require('fs');
const app = require('../../src/app');
const {
  User,
  Account,
  PolicyCategory,
  PolicyCarrier,
  Agent,
  Policy
} = require('../../src/models');

describe('Policy Bulk Import via Worker Threads Integration Tests', () => {
  const tempDir = path.resolve(__dirname, '../temp');

  beforeAll(() => {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should reject non-CSV and non-XLSX file uploads', async () => {
    const invalidFile = path.join(tempDir, 'test.txt');
    fs.writeFileSync(invalidFile, 'some text content');

    const res = await request(app)
      .post('/api/v1/policies/import')
      .attach('file', invalidFile);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should reject request when no file is attached', async () => {
    const res = await request(app).post('/api/v1/policies/import');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should successfully import valid CSV using Worker Thread', async () => {
    const csvContent = [
      'agent,userType,policy_mode,producer,policy_number,premium_amount_written,premium_amount,policy_type,company_name,category_name,policy_start_date,policy_end_date,csr,account_name,email,gender,firstname,city,account_type,phone,address,state,zip,dob,primary,Applicant ID,agency_id,hasActive ClientPolicy',
      'Alex Watson,Active Client,12,Brandie Placencia,POL-TEST-001,,1180.83,Single,Integon Gen Ins Corp,Commercial Auto,2018-11-02,2019-11-02,Tami Ellison,Lura Lucca Account,lura.lucca@test.com,,Lura Lucca,MOCKSVILLE,Commercial,8677356559,170 MATTHIAS CT,NC,27028,1960-02-11,,,,',
      'Alex Watson,Active Client,12,Sol Birney,POL-TEST-002,,2105.90,Single,Integon Ind Corp,Commercial Auto,2018-11-09,2019-11-09,Molly Eaton,Torie Buchanan Account,torie.buchanan@test.com,,Torie Buchanan,WINSTON SALEM,Commercial,6094964988,910 DELMONTE DR,NC,27106,1946-10-17,,,,',
      'Alex Watson,Active Client,12,Brandie Placencia,POL-TEST-003,,500.00,Single,Integon Gen Ins Corp,Commercial Auto,2019-01-01,2020-01-01,Tami Ellison,Lura Lucca Account,lura.lucca@test.com,,Lura Lucca,MOCKSVILLE,Commercial,8677356559,170 MATTHIAS CT,NC,27028,1960-02-11,,,,'
    ].join('\n');

    const validCsvPath = path.join(tempDir, 'valid_test.csv');
    fs.writeFileSync(validCsvPath, csvContent);

    const res = await request(app)
      .post('/api/v1/policies/import')
      .attach('file', validCsvPath);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.summary).toBeDefined();
    expect(res.body.summary.totalRows).toBe(3);
    expect(res.body.summary.inserted).toBe(3);
    expect(res.body.summary.failed).toBe(0);

    // Verify master entity deduplication: lura.lucca@test.com has 2 policies but only 1 User record
    expect(res.body.entities.users).toBe(2);
    expect(res.body.entities.policies).toBe(3);
    expect(res.body.entities.agents).toBe(1); // 'Alex Watson' reused

    // Check DB counts directly
    const userCount = await User.countDocuments();
    expect(userCount).toBe(2);

    const policyCount = await Policy.countDocuments();
    expect(policyCount).toBe(3);

    const agentCount = await Agent.countDocuments();
    expect(agentCount).toBe(1);
  });

  it('should handle rows with invalid date range without failing whole import', async () => {
    const csvContent = [
      'agent,userType,policy_mode,producer,policy_number,premium_amount_written,premium_amount,policy_type,company_name,category_name,policy_start_date,policy_end_date,csr,account_name,email,gender,firstname,city,account_type,phone,address,state,zip,dob,primary,Applicant ID,agency_id,hasActive ClientPolicy',
      'Agent Alpha,Active Client,12,Prod A,POL-VALID-10,,1000,Single,Carrier A,Auto,2020-01-01,2021-01-01,CSR A,Acc A,userA@test.com,,User A,City A,Personal,123456,Addr A,ST,12345,1980-01-01,,,,',
      'Agent Alpha,Active Client,12,Prod B,POL-INVALID-DATE,,1000,Single,Carrier A,Auto,2021-01-01,2020-01-01,CSR B,Acc B,userB@test.com,,User B,City B,Personal,123456,Addr B,ST,12345,1980-01-01,,,,'
    ].join('\n');

    const invalidDateCsv = path.join(tempDir, 'invalid_date.csv');
    fs.writeFileSync(invalidDateCsv, csvContent);

    const res = await request(app)
      .post('/api/v1/policies/import')
      .attach('file', invalidDateCsv);

    expect(res.status).toBe(200);
    expect(res.body.summary.totalRows).toBe(2);
    expect(res.body.summary.inserted).toBe(1);
    expect(res.body.summary.failed).toBe(1);
    expect(res.body.validationErrors).toHaveLength(1);
    expect(res.body.validationErrors[0].policyNumber).toBe('POL-INVALID-DATE');
  });

  it('should be safe to retry (idempotent re-import)', async () => {
    const csvContent = [
      'agent,userType,policy_mode,producer,policy_number,premium_amount_written,premium_amount,policy_type,company_name,category_name,policy_start_date,policy_end_date,csr,account_name,email,gender,firstname,city,account_type,phone,address,state,zip,dob,primary,Applicant ID,agency_id,hasActive ClientPolicy',
      'Agent Alpha,Active Client,12,Prod A,POL-IDEMPOTENT-1,,1000,Single,Carrier A,Auto,2020-01-01,2021-01-01,CSR A,Acc A,userA@test.com,,User A,City A,Personal,123456,Addr A,ST,12345,1980-01-01,,,,'
    ].join('\n');

    const file1 = path.join(tempDir, 'idempotent.csv');
    fs.writeFileSync(file1, csvContent);

    // First import
    const res1 = await request(app).post('/api/v1/policies/import').attach('file', file1);
    expect(res1.body.summary.inserted).toBe(1);

    // Second import of the same file
    const file2 = path.join(tempDir, 'idempotent_copy.csv');
    fs.writeFileSync(file2, csvContent);
    const res2 = await request(app).post('/api/v1/policies/import').attach('file', file2);

    expect(res2.status).toBe(200);
    // Should not duplicate policy in DB
    const totalPolicies = await Policy.countDocuments({ policyNumber: 'POL-IDEMPOTENT-1' });
    expect(totalPolicies).toBe(1);
  });

  it('should correctly parse flexible header variations and populate all 6 collections with correct foreign keys', async () => {
    // Header with Title Case, spaces, and aliases
    const csvContent = [
      'Agent Name,User Type,policy_mode,producer,Policy Number,premium_amount_written,premium_amount,policy_type,Company Name,Category Name,Policy Start Date,Policy End Date,csr,Account Name,Email,Gender,First Name,City,Account Type,Phone Number,Street Address,State,Zip Code,DOB,primary,Applicant ID,agency_id,hasActive ClientPolicy',
      'Agent Bravo,Active Client,12,Prod B,POL-FLEX-001,,1500,Single,Carrier Flex Corp,Flex Auto,2021-01-01,2022-01-01,CSR B,Flex Account,flex.user@test.com,Female,Flex User,San Francisco,Commercial,5551234567,123 Market St,CA,94105,1985-05-15,,,,',
      'Agent Bravo,Active Client,12,Prod B,POL-FLEX-002,,2200,Single,Carrier Flex Corp,Flex Home,2021-02-01,2022-02-01,CSR B,Flex Account,flex.user@test.com,Female,Flex User,San Francisco,Commercial,5551234567,123 Market St,CA,94105,1985-05-15,,,,'
    ].join('\n');

    const flexCsvPath = path.join(tempDir, 'flexible_headers.csv');
    fs.writeFileSync(flexCsvPath, csvContent);

    const res = await request(app)
      .post('/api/v1/policies/import')
      .attach('file', flexCsvPath);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.summary.totalRows).toBe(2);
    expect(res.body.summary.inserted).toBe(2);
    expect(res.body.summary.failed).toBe(0);

    // Verify inserted counts per collection
    expect(res.body.summary.insertedCounts).toBeDefined();
    expect(res.body.summary.insertedCounts.policies).toBe(2);
    expect(res.body.summary.insertedCounts.users).toBe(1); // 1 user with 2 policies
    expect(res.body.summary.insertedCounts.agents).toBe(1);
    expect(res.body.summary.insertedCounts.accounts).toBe(1);
    expect(res.body.summary.insertedCounts.categories).toBe(2); // Auto and Home
    expect(res.body.summary.insertedCounts.carriers).toBe(1);

    // Verify User record in DB has all fields correctly mapped
    const user = await User.findOne({ email: 'flex.user@test.com' });
    expect(user).not.toBeNull();
    expect(user.firstName).toBe('Flex User');
    expect(user.email).toBe('flex.user@test.com');
    expect(user.phone).toBe('5551234567');
    expect(user.address).toBe('123 Market St');
    expect(user.city).toBe('San Francisco');
    expect(user.state).toBe('CA');
    expect(user.zipCode).toBe('94105');
    expect(user.gender).toBe('Female');
    expect(user.userType).toBe('Active Client');
    expect(user.dob).toEqual(new Date('1985-05-15'));

    // Verify Policy record has proper foreign key linkages
    const policy = await Policy.findOne({ policyNumber: 'POL-FLEX-001' });
    expect(policy).not.toBeNull();
    expect(policy.userId.toString()).toBe(user._id.toString());
    expect(policy.accountId).not.toBeNull();
    expect(policy.categoryId).not.toBeNull();
    expect(policy.companyId).not.toBeNull();
    expect(policy.agentId).not.toBeNull();

    // Verify collection names in MongoDB are exact
    expect(User.collection.name).toBe('users');
    expect(Agent.collection.name).toBe('agents');
    expect(Account.collection.name).toBe('accounts');
    expect(PolicyCategory.collection.name).toBe('policycategories');
    expect(PolicyCarrier.collection.name).toBe('policycarriers');
    expect(Policy.collection.name).toBe('policies');
  });
});
