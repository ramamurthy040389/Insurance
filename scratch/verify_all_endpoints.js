const request = require('supertest');
const app = require('../src/app');
const mongoose = require('mongoose');

async function verify() {
  await mongoose.connect('mongodb://127.0.0.1:27017/insurance');
  console.log('Connected to MongoDB');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      process.exitCode = 1;
    }
  }

  console.log('\n--- 1. GET /api/v1/policies ---');
  // 1a. Pagination
  const pol1 = await request(app).get('/api/v1/policies?page=2&limit=5');
  assert(pol1.status === 200, 'Status 200 for paginated policies');
  assert(pol1.body.data.length === 5, 'Page limit respected (5 items)');
  assert(pol1.body.pagination.page === 2 && pol1.body.pagination.limit === 5, 'Pagination metadata matches page 2, limit 5');
  assert(pol1.body.pagination.all === false, 'all flag is false');

  // 1b. all=true
  const polAll = await request(app).get('/api/v1/policies?all=true');
  assert(polAll.status === 200, 'Status 200 for all=true');
  assert(polAll.body.data.length === polAll.body.pagination.total, 'Returns all records without pagination');
  assert(polAll.body.pagination.all === true, 'Pagination all flag is true');

  // 1c. Date range
  const polDates = await request(app).get('/api/v1/policies?startDate=2018-01-01&endDate=2018-06-30&all=true');
  assert(polDates.status === 200, 'Status 200 for date range');
  const validDates = polDates.body.data.every(p => {
    const d = new Date(p.policyStartDate);
    return d >= new Date('2018-01-01T00:00:00.000Z') && d <= new Date('2018-06-30T23:59:59.999Z');
  });
  assert(validDates && polDates.body.data.length > 0, `All returned policies match date range (${polDates.body.data.length} found)`);

  // 1d. Search
  const polSearch = await request(app).get('/api/v1/policies?search=YEEX9MOIBU7X');
  assert(polSearch.status === 200, 'Status 200 for policy search');
  assert(polSearch.body.data.length >= 1 && polSearch.body.data[0].policyNumber === 'YEEX9MOIBU7X', 'Found policy by search');

  console.log('\n--- 2. GET /api/v1/policies/search ---');
  // 2a. Search by username with pagination
  const userPol1 = await request(app).get('/api/v1/policies/search?username=madler@yahoo.ca&limit=1');
  assert(userPol1.status === 200, 'Status 200 for user policy search');
  assert(userPol1.body.policies.length <= 1, 'Limit respected');
  assert(userPol1.body.pagination !== undefined, 'Pagination metadata included');

  // 2b. Search by username with all=true
  const userPolAll = await request(app).get('/api/v1/policies/search?username=madler@yahoo.ca&all=true');
  assert(userPolAll.status === 200, 'Status 200 for user policies with all=true');
  assert(userPolAll.body.pagination.all === true, 'all flag is true');

  // 2c. Search with date range
  const userPolDate = await request(app).get('/api/v1/policies/search?username=madler@yahoo.ca&startDate=2018-01-01&endDate=2019-12-31');
  assert(userPolDate.status === 200, 'Status 200 for user policies with date range');
  assert(userPolDate.body.policies.length >= 1, 'Policy found within date range');

  console.log('\n--- 3. GET /api/v1/policies/summary ---');
  // 3a. Summary with pagination
  const sum1 = await request(app).get('/api/v1/policies/summary?page=1&limit=3');
  assert(sum1.status === 200, 'Status 200 for paginated summary');
  assert(sum1.body.data.length === 3, 'Page limit respected (3 users)');
  assert(sum1.body.pagination.total > 0, 'Pagination total present');

  // 3b. Summary with all=true
  const sumAll = await request(app).get('/api/v1/policies/summary?all=true');
  assert(sumAll.status === 200, 'Status 200 for summary all=true');
  assert(sumAll.body.data.length === sumAll.body.pagination.total, 'All user summaries returned');
  assert(sumAll.body.pagination.all === true, 'all flag is true');

  // 3c. Summary with search
  const sumSearch = await request(app).get('/api/v1/policies/summary?search=Cynthia');
  assert(sumSearch.status === 200, 'Status 200 for summary search');
  assert(sumSearch.body.data.some(s => s.firstName.includes('Cynthia')), 'Found Cynthia in summary');

  console.log('\n--- 4. GET /api/v1/policies/categories ---');
  // 4a. Categories with pagination
  const cat1 = await request(app).get('/api/v1/policies/categories?page=1&limit=5');
  assert(cat1.status === 200, 'Status 200 for paginated categories');
  assert(cat1.body.categories.length === 5, 'Limit 5 respected');
  assert(cat1.body.pagination.totalPages > 1, 'Multiple pages available');

  // 4b. Categories with all=true
  const catAll = await request(app).get('/api/v1/policies/categories?all=true');
  assert(catAll.status === 200, 'Status 200 for categories all=true');
  assert(catAll.body.categories.length === catAll.body.pagination.total, 'All categories returned');
  assert(catAll.body.pagination.all === true, 'all flag is true');

  // 4c. Categories with search
  const catSearch = await request(app).get('/api/v1/policies/categories?search=Auto');
  assert(catSearch.status === 200, 'Status 200 for category search');
  assert(catSearch.body.categories.some(c => c.categoryName.toLowerCase().includes('auto')), 'Found Auto category');

  console.log('\n--- 5. GET /api/v1/policies/carriers ---');
  // 5a. Carriers with pagination
  const car1 = await request(app).get('/api/v1/policies/carriers?page=1&limit=5');
  assert(car1.status === 200, 'Status 200 for paginated carriers');
  assert(car1.body.carriers.length === 5, 'Limit 5 respected');

  // 5b. Carriers with all=true
  const carAll = await request(app).get('/api/v1/policies/carriers?all=true');
  assert(carAll.status === 200, 'Status 200 for carriers all=true');
  assert(carAll.body.carriers.length === carAll.body.pagination.total, 'All carriers returned');
  assert(carAll.body.pagination.all === true, 'all flag is true');

  // 5c. Carriers with search
  const carSearch = await request(app).get('/api/v1/policies/carriers?search=Integon');
  assert(carSearch.status === 200, 'Status 200 for carrier search');
  assert(carSearch.body.carriers.some(c => c.companyName.toLowerCase().includes('integon')), 'Found Integon carrier');

  console.log('\n--- 6. GET /api/v1/messages ---');
  // Create a test message first
  await request(app).post('/api/v1/messages').send({
    message: 'Test pagination and filter message',
    day: '2026-11-15',
    time: '09:00'
  });

  // 6a. Messages with pagination
  const msg1 = await request(app).get('/api/v1/messages?page=1&limit=5');
  assert(msg1.status === 200, 'Status 200 for paginated messages');
  assert(msg1.body.messages !== undefined, 'messages array present');
  assert(msg1.body.pagination !== undefined, 'pagination metadata present');

  // 6b. Messages with all=true
  const msgAll = await request(app).get('/api/v1/messages?all=true');
  assert(msgAll.status === 200, 'Status 200 for messages all=true');
  assert(msgAll.body.messages.length === msgAll.body.pagination.total, 'All messages returned');
  assert(msgAll.body.pagination.all === true, 'all flag is true');

  // 6c. Messages with date range
  const msgDate = await request(app).get('/api/v1/messages?startDate=2026-11-01&endDate=2026-11-30');
  assert(msgDate.status === 200, 'Status 200 for messages date range');
  assert(msgDate.body.messages.length >= 1, 'Found message in November 2026 range');

  // 6d. Messages with search
  const msgSearch = await request(app).get('/api/v1/messages?search=Test%20pagination');
  assert(msgSearch.status === 200, 'Status 200 for messages search');
  assert(msgSearch.body.messages.some(m => m.message.includes('Test pagination')), 'Found message by search keyword');

  console.log(`\n========================================`);
  console.log(`VERIFICATION SUMMARY: ${passed}/${total} assertions passed!`);
  console.log(`========================================\n`);

  await mongoose.disconnect();
}

verify().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
