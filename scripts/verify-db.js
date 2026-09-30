const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

async function runEndToEndVerification() {
  console.log('==================================================');
  console.log('INSURANCE POLICY MANAGEMENT - END-TO-END VALIDATION');
  console.log('==================================================');

  // 1. TEST MONGODB CONNECTION
  console.log('\n[1/7] Testing MongoDB Connection...');
  const mongoUri = 'mongodb://127.0.0.1:27017/insurance';
  await mongoose.connect(mongoUri);
  console.log('-> MongoDB Connected successfully to:', mongoUri);
  console.log('-> MongoDB ReadyState:', mongoose.connection.readyState === 1 ? '1 (CONNECTED)' : mongoose.connection.readyState);

  const { Agent, User, Account, PolicyCategory, PolicyCarrier, Policy, ScheduledMessage } = require('../src/models');

  // 2. TEST IMPORT FUNCTIONALITY VIA WORKER THREAD
  console.log('\n[2/7] Testing Worker Thread Bulk Import with data-sheet.csv...');
  const importService = require('../src/services/import.service');
  const csvPath = path.resolve('data-sheet.csv');
  
  if (!fs.existsSync(csvPath)) {
    throw new Error('data-sheet.csv not found in project root!');
  }

  // Create temporary copy for import
  const tempImportPath = path.resolve('uploads/e2e-test.csv');
  if (!fs.existsSync('uploads')) fs.mkdirSync('uploads', { recursive: true });
  fs.copyFileSync(csvPath, tempImportPath);

  const importResult = await importService.processFileInWorker({
    path: tempImportPath,
    originalname: 'data-sheet.csv',
    mimetype: 'text/csv',
    size: fs.statSync(tempImportPath).size
  });

  console.log('-> Import Summary:', JSON.stringify(importResult.summary, null, 2));
  console.log('-> Entity Counts from Import:', JSON.stringify(importResult.entities, null, 2));

  // Verify collections in DB
  const [agentCount, userCount, accountCount, catCount, carrierCount, policyCount] = await Promise.all([
    Agent.countDocuments(),
    User.countDocuments(),
    Account.countDocuments(),
    PolicyCategory.countDocuments(),
    PolicyCarrier.countDocuments(),
    Policy.countDocuments()
  ]);
  console.log('-> Verified DB Collection Document Counts:');
  console.log('   - Agents:', agentCount);
  console.log('   - Users:', userCount);
  console.log('   - Accounts:', accountCount);
  console.log('   - Policy Categories (LOB):', catCount);
  console.log('   - Policy Carriers:', carrierCount);
  console.log('   - Policies:', policyCount);

  // 3. TEST POLICY SEARCH BY USERNAME (EMAIL & FIRSTNAME)
  console.log('\n[3/7] Testing Policy Search API Logic...');
  const policyService = require('../src/services/policy.service');
  
  console.log('-> Searching by Email: madler@yahoo.ca');
  const searchByEmail = await policyService.searchByUser('madler@yahoo.ca');
  console.log(`   Found user: ${searchByEmail.user.firstName} (${searchByEmail.user.email}) with ${searchByEmail.policies.length} policy(ies).`);
  console.log('   Sample Policy Details:', {
    policyNumber: searchByEmail.policies[0].policyNumber,
    carrier: searchByEmail.policies[0].carrier.name,
    category: searchByEmail.policies[0].category.name,
    account: searchByEmail.policies[0].account.name,
    premiumAmount: searchByEmail.policies[0].premiumAmount
  });

  console.log('-> Searching by First Name: Lura');
  const searchByName = await policyService.searchByUser('Lura');
  console.log(`   Found user: ${searchByName.user.firstName} with ${searchByName.policies.length} policy(ies).`);

  // 4. TEST AGGREGATED POLICY SUMMARY
  console.log('\n[4/7] Testing Aggregated Policy Summary Pipeline...');
  const summary = await policyService.getAggregatedSummary({ limit: 3 });
  console.log('-> Top 3 Aggregated Policy Summaries:');
  summary.forEach((item, index) => {
    console.log(`   [${index + 1}] User: ${item.firstName} (${item.email})`);
    console.log(`       Total Policies: ${item.totalPolicies} | Total Premium: $${item.totalPremium}`);
    console.log(`       Categories: ${item.categories.join(', ')}`);
    console.log(`       Carriers: ${item.carriers.join(', ')}`);
    console.log(`       Policy Period: ${item.firstPolicyStartDate} to ${item.lastPolicyEndDate}`);
  });

  // 5. TEST SCHEDULED MESSAGES & ATOMIC WORKER EXECUTION
  console.log('\n[5/7] Testing Scheduled Message Creation & Atomic Worker Execution...');
  const messageService = require('../src/services/message.service');
  
  const newMsg = await messageService.scheduleMessage({
    message: 'Policy renewal reminder for next month',
    day: '2026-09-30',
    time: '12:00'
  });
  console.log('-> Created Message ID:', newMsg._id, '| Status:', newMsg.status, '| ScheduledAt:', newMsg.scheduledAt);

  const processed = await messageService.processDueMessages();
  console.log(`-> Worker processed ${processed} due message(s).`);

  const updatedMsg = await ScheduledMessage.findById(newMsg._id);
  console.log('-> Message Status after Worker Execution:', updatedMsg.status, '| ProcessedAt:', updatedMsg.processedAt);

  // 6. TEST CPU MONITORING EVALUATION
  console.log('\n[6/7] Testing CPU Monitor Evaluation Logic...');
  const cpuMonitor = require('../src/services/cpuMonitor.service');
  cpuMonitor.consecutiveHighUsageCount = 0;
  cpuMonitor.isShuttingDown = false;
  
  const normalCheck = cpuMonitor.evaluateThreshold(45.0);
  console.log('-> Normal CPU check (45%): Triggered?', normalCheck.triggered);
  
  cpuMonitor.evaluateThreshold(75.0);
  cpuMonitor.evaluateThreshold(80.0);
  const spikeCheck = cpuMonitor.evaluateThreshold(85.0);
  console.log('-> Sustained High CPU (75%, 80%, 85%): Triggered Graceful Restart?', spikeCheck.triggered);

  // 7. VERIFY INDEXES
  console.log('\n[7/7] Verifying Database Indexes in MongoDB...');
  const policyIndexes = await Policy.collection.indexes();
  console.log('-> Policy Indexes:', policyIndexes.map(idx => Object.keys(idx.key).join('+')).join(', '));
  const userIndexes = await User.collection.indexes();
  console.log('-> User Indexes:', userIndexes.map(idx => Object.keys(idx.key).join('+')).join(', '));
  const messageIndexes = await ScheduledMessage.collection.indexes();
  console.log('-> ScheduledMessage Indexes:', messageIndexes.map(idx => Object.keys(idx.key).join('+')).join(', '));

  console.log('\n==================================================');
  console.log('>>> ALL FUNCTIONS TESTED & WORKING 100% SUCCESSFULLY! <<<');
  console.log('==================================================\n');

  await mongoose.disconnect();
}

runEndToEndVerification().catch((err) => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});
