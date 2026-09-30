const { parentPort, workerData } = require('worker_threads');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const xlsx = require('xlsx');
const mongoose = require('mongoose');

const {
  Agent,
  User,
  Account,
  PolicyCategory,
  PolicyCarrier,
  Policy,
  ScheduledMessage
} = require('../models');
const { parseDate, isDateRangeValid } = require('../utils/dateUtils');
const { normalizeEmail, normalizePhone, sanitizeString, parseNumber } = require('../utils/stringUtils');

/**
 * Normalizes a header or key name for fuzzy/flexible matching:
 * Lowercases and strips all spaces, underscores, hyphens, and periods.
 */
function canonicalKey(key) {
  if (!key) return '';
  return String(key)
    .trim()
    .replace(/^\ufeff/, '') // Strip UTF-8 BOM
    .toLowerCase()
    .replace(/[\s_\-.]/g, '');
}

/**
 * Creates a case-insensitive, punctuation-insensitive lookup map for a row
 */
function createNormalizedRow(rawRow) {
  const normalized = {};
  for (const [key, value] of Object.entries(rawRow)) {
    const cKey = canonicalKey(key);
    if (cKey) {
      normalized[cKey] = typeof value === 'string' ? value.trim() : value;
    }
  }
  return normalized;
}

/**
 * Retrieves a value from the normalized row using an array of canonical candidate aliases
 */
function getRowValue(normalizedRow, aliases) {
  for (const alias of aliases) {
    const cAlias = canonicalKey(alias);
    if (normalizedRow[cAlias] !== undefined && normalizedRow[cAlias] !== null && normalizedRow[cAlias] !== '') {
      return normalizedRow[cAlias];
    }
  }
  return null;
}

/**
 * Definition of required canonical fields and their common aliases
 */
const CANONICAL_FIELD_ALIASES = {
  policyNumber: ['policy_number', 'policynumber', 'policy_no', 'policyno', 'policyid', 'policy_id', 'policynum', 'policies', 'policy'],
  policyStartDate: ['policy_start_date', 'policystartdate', 'start_date', 'startdate', 'effective_date', 'effectivedate'],
  policyEndDate: ['policy_end_date', 'policyenddate', 'end_date', 'enddate', 'expiration_date', 'expirationdate'],
  companyName: ['company_name', 'companyname', 'policycarriers', 'policy_carriers', 'policycarrier', 'policy_carrier', 'carrier', 'carrier_name', 'carriername', 'insurance_company', 'insurancecompany'],
  categoryName: ['category_name', 'categoryname', 'policycategories', 'policy_categories', 'policycategory', 'policy_category', 'policy_category_name', 'category', 'lob', 'line_of_business', 'lineofbusiness', 'policy_lob'],
  accountName: ['account_name', 'accountname', 'accounts', 'account', 'insured_name', 'insuredname'],
  accountType: ['account_type', 'accounttype', 'type_of_account'],
  agentName: ['agent', 'agents', 'agentname', 'agent_name', 'producer_agent', 'agent_id'],
  email: ['email', 'useremail', 'user_email', 'email_address', 'emailaddress'],
  firstName: ['firstname', 'first_name', 'firstName', 'first name', 'username', 'user_name', 'name', 'client_name', 'insured', 'users', 'user'],
  dob: ['dob', 'date_of_birth', 'birthdate', 'birth_date', 'dateofbirth'],
  phone: ['phone', 'phonenumber', 'phone_number', 'mobile', 'cell', 'telephone'],
  address: ['address', 'street_address', 'street', 'address_line_1', 'addressline1'],
  city: ['city', 'city_name'],
  state: ['state', 'state_code', 'province'],
  zipCode: ['zip', 'zipcode', 'zip_code', 'postal_code', 'postalcode'],
  gender: ['gender', 'sex'],
  userType: ['usertype', 'user_type', 'client_type', 'user_category'],
  policyMode: ['policymode', 'policy_mode', 'mode'],
  policyType: ['policytype', 'policy_type', 'type'],
  premiumAmount: ['premiumamount', 'premium_amount', 'premium'],
  premiumAmountWritten: ['premiumamountwritten', 'premium_amount_written', 'premium_written'],
  producer: ['producer', 'producer_name'],
  csr: ['csr', 'csr_name'],
  primary: ['primary', 'is_primary'],
  applicantId: ['applicantid', 'applicant_id', 'applicant id'],
  agencyId: ['agencyid', 'agency_id'],
  hasActiveClientPolicy: ['hasactiveclientpolicy', 'hasactive clientpolicy', 'has_active_client_policy']
};

/**
 * Parses a CSV file into an array of raw row objects with BOM and whitespace trimming
 */
async function parseCsvFile(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(filePath)
      .pipe(csv({
        mapHeaders: ({ header }) => (header ? header.trim().replace(/^\ufeff/, '') : header),
        mapValues: ({ value }) => (typeof value === 'string' ? value.trim() : value)
      }))
      .on('data', (row) => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', (err) => reject(err));
  });
}

/**
 * Parses an XLSX/XLS file into an array of raw row objects
 */
function parseXlsxFile(filePath) {
  const workbook = xlsx.readFile(filePath, { cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('Excel file has no sheets');
  }
  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows = xlsx.utils.sheet_to_json(worksheet, { defval: '', raw: false });
  return rawRows.map((row) => {
    const cleaned = {};
    for (const [k, v] of Object.entries(row)) {
      cleaned[k.trim().replace(/^\ufeff/, '')] = typeof v === 'string' ? v.trim() : v;
    }
    return cleaned;
  });
}

/**
 * Main worker execution function
 */
async function processImport() {
  const { filePath, originalname, mongoUri } = workerData;
  const ext = path.extname(originalname || filePath).toLowerCase();

  console.log(`\n===============================================================`);
  console.log(`[IMPORT WORKER] [START] Initiating bulk import via Worker Thread`);
  console.log(`  - File: ${originalname || filePath}`);
  console.log(`  - Extension: ${ext}`);
  console.log(`  - MongoDB URI: ${mongoUri ? mongoUri.replace(/\/\/.*@/, '//***:***@') : 'N/A'}`);
  console.log(`===============================================================`);

  const summary = {
    totalRows: 0,
    processed: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    insertedCounts: {
      agents: 0,
      users: 0,
      accounts: 0,
      categories: 0,
      carriers: 0,
      policies: 0,
      scheduledMessages: 0
    }
  };

  const validationErrors = [];

  try {
    // 1. Connect to MongoDB in worker thread
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri, {
        maxPoolSize: 20,
        serverSelectionTimeoutMS: 10000
      });
      console.log(`[IMPORT WORKER] [CONNECT] Successfully connected to MongoDB.`);
    }

    // 2. Parse file according to extension
    let rawRows = [];
    if (ext === '.csv') {
      rawRows = await parseCsvFile(filePath);
    } else if (ext === '.xlsx' || ext === '.xls') {
      rawRows = parseXlsxFile(filePath);
    } else {
      throw new Error(`Unsupported file type: '${ext}'. Only .csv and .xlsx/.xls files are supported.`);
    }

    summary.totalRows = rawRows.length;
    console.log(`[IMPORT WORKER] [PARSE] Extracted ${rawRows.length} raw records from file.`);

    if (rawRows.length === 0) {
      console.log(`[IMPORT WORKER] [PARSE] File is completely empty (0 rows). Exiting early.`);
      parentPort.postMessage({
        success: true,
        summary,
        entities: { agents: 0, users: 0, accounts: 0, categories: 0, carriers: 0, policies: 0 },
        validationErrors: []
      });
      return;
    }

    // 3. Header inspection & flexible required column validation
    const firstRowNormalized = createNormalizedRow(rawRows[0]);
    const requiredChecks = [
      { field: 'policy_number', aliases: CANONICAL_FIELD_ALIASES.policyNumber },
      { field: 'policy_start_date', aliases: CANONICAL_FIELD_ALIASES.policyStartDate },
      { field: 'policy_end_date', aliases: CANONICAL_FIELD_ALIASES.policyEndDate },
      { field: 'company_name', aliases: CANONICAL_FIELD_ALIASES.companyName },
      { field: 'category_name', aliases: CANONICAL_FIELD_ALIASES.categoryName },
      { field: 'account_name', aliases: CANONICAL_FIELD_ALIASES.accountName },
      { field: 'email', aliases: CANONICAL_FIELD_ALIASES.email },
      { field: 'firstname', aliases: CANONICAL_FIELD_ALIASES.firstName }
    ];

    const missingRequired = requiredChecks
      .filter((check) => getRowValue(firstRowNormalized, check.aliases) === null && !(check.aliases.some(a => firstRowNormalized[canonicalKey(a)] !== undefined)))
      .map((check) => check.field);

    if (missingRequired.length > 0) {
      const detectedHeaders = Object.keys(rawRows[0]).join(', ');
      throw new Error(
        `Missing required column(s) in header: ${missingRequired.join(', ')}. Detected headers: [${detectedHeaders}]`
      );
    }

    console.log(`[IMPORT WORKER] [HEADERS] Header validation passed. Found all required column mappings.`);

    // 4. Preload Existing Entities from DB into in-memory caches to prevent N+1 queries and guarantee deduplication
    const [existingAgents, existingUsers, existingAccounts, existingCategories, existingCarriers] = await Promise.all([
      Agent.find({}).lean(),
      User.find({}).lean(),
      Account.find({}).lean(),
      PolicyCategory.find({}).lean(),
      PolicyCarrier.find({}).lean()
    ]);

    // Build lookup maps (safe against missing or malformed fields in existing records)
    const agentCache = new Map();
    existingAgents.forEach((a) => {
      if (a.agent_name) agentCache.set(a.agent_name.trim().toLowerCase(), a._id);
    });

    const userCacheByEmail = new Map();
    const userCacheByName = new Map();
    existingUsers.forEach((u) => {
      if (u.email) userCacheByEmail.set(u.email.trim().toLowerCase(), u._id);
      if (u.firstName) userCacheByName.set(u.firstName.trim().toLowerCase(), u._id);
    });

    const accountCache = new Map();
    existingAccounts.forEach((acc) => {
      if (acc.accountName) {
        const key = `${acc.accountName.trim().toLowerCase()}|${(acc.accountType || '').trim().toLowerCase()}`;
        accountCache.set(key, acc._id);
        // Also map just accountName as fallback
        if (!accountCache.has(acc.accountName.trim().toLowerCase())) {
          accountCache.set(acc.accountName.trim().toLowerCase(), acc._id);
        }
      }
    });

    const categoryCache = new Map();
    existingCategories.forEach((c) => {
      if (c.categoryName) categoryCache.set(c.categoryName.trim().toLowerCase(), c._id);
    });

    const carrierCache = new Map();
    existingCarriers.forEach((c) => {
      if (c.companyName) carrierCache.set(c.companyName.trim().toLowerCase(), c._id);
    });

    console.log(`[IMPORT WORKER] [PRELOAD] Preloaded existing master entities from MongoDB:`);
    console.log(`  - Agents: ${agentCache.size}`);
    console.log(`  - Users: ${userCacheByEmail.size}`);
    console.log(`  - Accounts: ${accountCache.size}`);
    console.log(`  - Categories: ${categoryCache.size}`);
    console.log(`  - Carriers: ${carrierCache.size}`);

    // Track newly prepared items to insert in bulk
    const newAgentsToInsert = new Map();      // agent_name.toLowerCase() -> doc
    const newUsersToInsert = new Map();       // userId.toString() -> doc
    const newAccountsToInsert = new Map();    // accountKey -> doc
    const newCategoriesToInsert = new Map();  // categoryName.toLowerCase() -> doc
    const newCarriersToInsert = new Map();    // companyName.toLowerCase() -> doc

    // Map for temporary tracking of newly staged user IDs
    const stagedUserEmailMap = new Map();     // email.toLowerCase() -> ObjectId
    const stagedUserNameMap = new Map();      // firstName.toLowerCase() -> ObjectId

    // 5. First Pass: Validate Rows & Extract/Deduplicate Master Entities
    const validRows = [];

    for (let i = 0; i < rawRows.length; i++) {
      const rowNum = i + 2; // 1-based index including header
      const rawRow = rawRows[i];
      const norm = createNormalizedRow(rawRow);

      // Extract values with flexible alias support
      const policyNumber = sanitizeString(getRowValue(norm, CANONICAL_FIELD_ALIASES.policyNumber));
      const email = normalizeEmail(getRowValue(norm, CANONICAL_FIELD_ALIASES.email));
      const firstName = sanitizeString(getRowValue(norm, CANONICAL_FIELD_ALIASES.firstName));
      const companyName = sanitizeString(getRowValue(norm, CANONICAL_FIELD_ALIASES.companyName));
      const categoryName = sanitizeString(getRowValue(norm, CANONICAL_FIELD_ALIASES.categoryName));
      const accountName = sanitizeString(getRowValue(norm, CANONICAL_FIELD_ALIASES.accountName));
      const accountType = sanitizeString(getRowValue(norm, CANONICAL_FIELD_ALIASES.accountType));
      const agentName = sanitizeString(getRowValue(norm, CANONICAL_FIELD_ALIASES.agentName));

      const policyStartDate = parseDate(getRowValue(norm, CANONICAL_FIELD_ALIASES.policyStartDate));
      const policyEndDate = parseDate(getRowValue(norm, CANONICAL_FIELD_ALIASES.policyEndDate));
      const dob = parseDate(getRowValue(norm, CANONICAL_FIELD_ALIASES.dob));
      const phone = normalizePhone(getRowValue(norm, CANONICAL_FIELD_ALIASES.phone));
      const address = sanitizeString(getRowValue(norm, CANONICAL_FIELD_ALIASES.address));
      const city = sanitizeString(getRowValue(norm, CANONICAL_FIELD_ALIASES.city));
      const state = sanitizeString(getRowValue(norm, CANONICAL_FIELD_ALIASES.state));
      const zipCode = sanitizeString(getRowValue(norm, CANONICAL_FIELD_ALIASES.zipCode));
      const gender = sanitizeString(getRowValue(norm, CANONICAL_FIELD_ALIASES.gender));
      const userType = sanitizeString(getRowValue(norm, CANONICAL_FIELD_ALIASES.userType)) || 'Active Client';

      const policyMode = sanitizeString(getRowValue(norm, CANONICAL_FIELD_ALIASES.policyMode));
      const policyType = sanitizeString(getRowValue(norm, CANONICAL_FIELD_ALIASES.policyType));
      const premiumAmount = parseNumber(getRowValue(norm, CANONICAL_FIELD_ALIASES.premiumAmount));
      const premiumAmountWritten = parseNumber(getRowValue(norm, CANONICAL_FIELD_ALIASES.premiumAmountWritten));
      const producer = sanitizeString(getRowValue(norm, CANONICAL_FIELD_ALIASES.producer));
      const csr = sanitizeString(getRowValue(norm, CANONICAL_FIELD_ALIASES.csr));
      const primary = sanitizeString(getRowValue(norm, CANONICAL_FIELD_ALIASES.primary));
      const applicantId = sanitizeString(getRowValue(norm, CANONICAL_FIELD_ALIASES.applicantId));
      const agencyId = sanitizeString(getRowValue(norm, CANONICAL_FIELD_ALIASES.agencyId));
      const hasActiveClientPolicy = sanitizeString(getRowValue(norm, CANONICAL_FIELD_ALIASES.hasActiveClientPolicy));

      // Validate required fields
      const rowErrors = [];
      if (!policyNumber) rowErrors.push('Missing policy_number');
      if (!firstName) rowErrors.push('Missing firstname');
      if (!email) rowErrors.push('Missing or invalid email');
      if (!companyName) rowErrors.push('Missing company_name');
      if (!categoryName) rowErrors.push('Missing category_name');
      if (!accountName) rowErrors.push('Missing account_name');
      if (!policyStartDate) rowErrors.push('Missing or invalid policy_start_date');
      if (!policyEndDate) rowErrors.push('Missing or invalid policy_end_date');

      if (policyStartDate && policyEndDate && !isDateRangeValid(policyStartDate, policyEndDate)) {
        rowErrors.push(
          `policy_end_date (${getRowValue(norm, CANONICAL_FIELD_ALIASES.policyEndDate)}) cannot be before policy_start_date (${getRowValue(norm, CANONICAL_FIELD_ALIASES.policyStartDate)})`
        );
      }

      if (rowErrors.length > 0) {
        summary.failed++;
        validationErrors.push({
          row: rowNum,
          policyNumber: policyNumber || 'N/A',
          errors: rowErrors
        });
        console.warn(`[IMPORT WORKER] [VALIDATION ERROR] Row ${rowNum} rejected: ${rowErrors.join('; ')}`);
        continue;
      }

      // Deduplicate & Stage Master Entities
      // 1. Agent
      let resolvedAgentId = null;
      if (agentName) {
        const agentKey = agentName.toLowerCase();
        if (agentCache.has(agentKey)) {
          resolvedAgentId = agentCache.get(agentKey);
        } else if (newAgentsToInsert.has(agentKey)) {
          resolvedAgentId = newAgentsToInsert.get(agentKey)._id;
        } else {
          resolvedAgentId = new mongoose.Types.ObjectId();
          newAgentsToInsert.set(agentKey, {
            _id: resolvedAgentId,
            agent_name: agentName
          });
          agentCache.set(agentKey, resolvedAgentId);
        }
      }

      // 2. User (Deduplication by email and/or name)
      const userKeyEmail = email ? email.toLowerCase() : null;
      const userKeyName = firstName ? firstName.toLowerCase() : null;
      let resolvedUserId = null;

      // Check DB caches
      if (userKeyEmail && userCacheByEmail.has(userKeyEmail)) {
        resolvedUserId = userCacheByEmail.get(userKeyEmail);
      } else if (userKeyName && userCacheByName.has(userKeyName) && !userKeyEmail) {
        resolvedUserId = userCacheByName.get(userKeyName);
      } else if (userKeyEmail && stagedUserEmailMap.has(userKeyEmail)) {
        resolvedUserId = stagedUserEmailMap.get(userKeyEmail);
      } else if (userKeyName && stagedUserNameMap.has(userKeyName) && !userKeyEmail) {
        resolvedUserId = stagedUserNameMap.get(userKeyName);
      }

      if (resolvedUserId) {
        // User already exists or is staged -> update caches and merge missing attributes
        if (userKeyEmail) {
          userCacheByEmail.set(userKeyEmail, resolvedUserId);
          stagedUserEmailMap.set(userKeyEmail, resolvedUserId);
        }
        if (userKeyName) {
          userCacheByName.set(userKeyName, resolvedUserId);
          stagedUserNameMap.set(userKeyName, resolvedUserId);
        }

        // If staged in memory, supplement any null fields
        const stagedDoc = newUsersToInsert.get(resolvedUserId.toString());
        if (stagedDoc) {
          if (!stagedDoc.phone && phone) stagedDoc.phone = phone;
          if (!stagedDoc.address && address) stagedDoc.address = address;
          if (!stagedDoc.city && city) stagedDoc.city = city;
          if (!stagedDoc.state && state) stagedDoc.state = state;
          if (!stagedDoc.zipCode && zipCode) stagedDoc.zipCode = zipCode;
          if (!stagedDoc.dob && dob) stagedDoc.dob = dob;
          if (!stagedDoc.gender && gender) stagedDoc.gender = gender;
        }
      } else {
        // Brand new user -> generate ObjectId and stage
        resolvedUserId = new mongoose.Types.ObjectId();
        const userDoc = {
          _id: resolvedUserId,
          firstName,
          email,
          dob,
          phone,
          address,
          city,
          state,
          zipCode,
          gender,
          userType
        };
        newUsersToInsert.set(resolvedUserId.toString(), userDoc);
        if (userKeyEmail) {
          userCacheByEmail.set(userKeyEmail, resolvedUserId);
          stagedUserEmailMap.set(userKeyEmail, resolvedUserId);
        }
        if (userKeyName) {
          userCacheByName.set(userKeyName, resolvedUserId);
          stagedUserNameMap.set(userKeyName, resolvedUserId);
        }
      }

      // 3. Account (Deduplication by accountName + accountType)
      const accountKey = `${accountName.toLowerCase()}|${(accountType || '').toLowerCase()}`;
      let resolvedAccountId = null;
      if (accountCache.has(accountKey)) {
        resolvedAccountId = accountCache.get(accountKey);
      } else if (newAccountsToInsert.has(accountKey)) {
        resolvedAccountId = newAccountsToInsert.get(accountKey)._id;
      } else {
        resolvedAccountId = new mongoose.Types.ObjectId();
        newAccountsToInsert.set(accountKey, {
          _id: resolvedAccountId,
          accountName,
          accountType: accountType || null
        });
        accountCache.set(accountKey, resolvedAccountId);
      }

      // 4. PolicyCategory (Deduplication by categoryName)
      const categoryKey = categoryName.toLowerCase();
      let resolvedCategoryId = null;
      if (categoryCache.has(categoryKey)) {
        resolvedCategoryId = categoryCache.get(categoryKey);
      } else if (newCategoriesToInsert.has(categoryKey)) {
        resolvedCategoryId = newCategoriesToInsert.get(categoryKey)._id;
      } else {
        resolvedCategoryId = new mongoose.Types.ObjectId();
        newCategoriesToInsert.set(categoryKey, {
          _id: resolvedCategoryId,
          categoryName
        });
        categoryCache.set(categoryKey, resolvedCategoryId);
      }

      // 5. PolicyCarrier (Deduplication by companyName)
      const carrierKey = companyName.toLowerCase();
      let resolvedCarrierId = null;
      if (carrierCache.has(carrierKey)) {
        resolvedCarrierId = carrierCache.get(carrierKey);
      } else if (newCarriersToInsert.has(carrierKey)) {
        resolvedCarrierId = newCarriersToInsert.get(carrierKey)._id;
      } else {
        resolvedCarrierId = new mongoose.Types.ObjectId();
        newCarriersToInsert.set(carrierKey, {
          _id: resolvedCarrierId,
          companyName
        });
        carrierCache.set(carrierKey, resolvedCarrierId);
      }

      validRows.push({
        rowNum,
        parsed: {
          policyNumber,
          policyStartDate,
          policyEndDate,
          policyMode,
          policyType,
          premiumAmount,
          premiumAmountWritten,
          producer,
          csr,
          primary,
          applicantId,
          agencyId,
          hasActiveClientPolicy,
          agentId: resolvedAgentId,
          userId: resolvedUserId,
          accountId: resolvedAccountId,
          categoryId: resolvedCategoryId,
          companyId: resolvedCarrierId,
          email,
          firstName,
          accountName,
          categoryName,
          companyName
        }
      });
    }

    console.log(`[IMPORT WORKER] [NORMALIZE] Row validation and normalization completed:`);
    console.log(`  - Total Rows: ${summary.totalRows}`);
    console.log(`  - Valid Rows: ${validRows.length}`);
    console.log(`  - Rejected Rows: ${validationErrors.length}`);
    console.log(`[IMPORT WORKER] [DEDUP] Distinct master entities staged for insertion:`);
    console.log(`  - New Agents to Insert: ${newAgentsToInsert.size}`);
    console.log(`  - New Users to Insert: ${newUsersToInsert.size}`);
    console.log(`  - New Accounts to Insert: ${newAccountsToInsert.size}`);
    console.log(`  - New Categories to Insert: ${newCategoriesToInsert.size}`);
    console.log(`  - New Carriers to Insert: ${newCarriersToInsert.size}`);

    // 6. Bulk Insert Master Entities with idempotent upsert/insertMany error safety
    // Agents
    if (newAgentsToInsert.size > 0) {
      const agentDocs = Array.from(newAgentsToInsert.values());
      const ops = agentDocs.map((doc) => ({
        updateOne: {
          filter: { agent_name: doc.agent_name },
          update: { $setOnInsert: doc },
          upsert: true
        }
      }));
      const res = await Agent.bulkWrite(ops, { ordered: false });
      summary.insertedCounts.agents = res.upsertedCount || 0;
      console.log(
        `[IMPORT WORKER] [INSERT] 'agents' bulk write complete: ${summary.insertedCounts.agents} inserted, ${res.matchedCount || 0} matched existing.`
      );
    }

    // Users
    if (newUsersToInsert.size > 0) {
      const userDocs = Array.from(newUsersToInsert.values());
      const ops = userDocs.map((doc) => ({
        updateOne: {
          filter: { email: doc.email },
          update: { $setOnInsert: doc },
          upsert: true
        }
      }));
      const res = await User.bulkWrite(ops, { ordered: false });
      summary.insertedCounts.users = res.upsertedCount || 0;
      console.log(
        `[IMPORT WORKER] [INSERT] 'users' bulk write complete: ${summary.insertedCounts.users} inserted, ${res.matchedCount || 0} matched existing.`
      );
    }

    // Accounts
    if (newAccountsToInsert.size > 0) {
      const accountDocs = Array.from(newAccountsToInsert.values());
      const ops = accountDocs.map((doc) => ({
        updateOne: {
          filter: { accountName: doc.accountName, accountType: doc.accountType },
          update: { $setOnInsert: doc },
          upsert: true
        }
      }));
      const res = await Account.bulkWrite(ops, { ordered: false });
      summary.insertedCounts.accounts = res.upsertedCount || 0;
      console.log(
        `[IMPORT WORKER] [INSERT] 'accounts' bulk write complete: ${summary.insertedCounts.accounts} inserted, ${res.matchedCount || 0} matched existing.`
      );
    }

    // Policy Categories
    if (newCategoriesToInsert.size > 0) {
      const catDocs = Array.from(newCategoriesToInsert.values());
      const ops = catDocs.map((doc) => ({
        updateOne: {
          filter: { categoryName: doc.categoryName },
          update: { $setOnInsert: doc },
          upsert: true
        }
      }));
      const res = await PolicyCategory.bulkWrite(ops, { ordered: false });
      summary.insertedCounts.categories = res.upsertedCount || 0;
      console.log(
        `[IMPORT WORKER] [INSERT] 'policycategories' bulk write complete: ${summary.insertedCounts.categories} inserted, ${res.matchedCount || 0} matched existing.`
      );
    }

    // Policy Carriers
    if (newCarriersToInsert.size > 0) {
      const carrierDocs = Array.from(newCarriersToInsert.values());
      const ops = carrierDocs.map((doc) => ({
        updateOne: {
          filter: { companyName: doc.companyName },
          update: { $setOnInsert: doc },
          upsert: true
        }
      }));
      const res = await PolicyCarrier.bulkWrite(ops, { ordered: false });
      summary.insertedCounts.carriers = res.upsertedCount || 0;
      console.log(
        `[IMPORT WORKER] [INSERT] 'policycarriers' bulk write complete: ${summary.insertedCounts.carriers} inserted, ${res.matchedCount || 0} matched existing.`
      );
    }

    // 7. Policy Bulk Write / Idempotent Upsert with Strict Referential Integrity
    const policyBulkOps = [];
    const policyNumberSetInFile = new Set();

    for (const item of validRows) {
      const p = item.parsed;

      // Handle duplicate policy within the same file
      if (policyNumberSetInFile.has(p.policyNumber)) {
        summary.skipped++;
        validationErrors.push({
          row: item.rowNum,
          policyNumber: p.policyNumber,
          errors: [`Duplicate policy_number '${p.policyNumber}' found within the same import file`]
        });
        console.warn(`[IMPORT WORKER] [DUPLICATE POLICY] Row ${item.rowNum}: Duplicate policy_number '${p.policyNumber}' in file.`);
        continue;
      }
      policyNumberSetInFile.add(p.policyNumber);

      // Verify Referential Integrity
      if (!p.userId) {
        console.error(`[IMPORT WORKER] [INTEGRITY ERROR] Row ${item.rowNum}: Missing userId for policy ${p.policyNumber}`);
        summary.failed++;
        validationErrors.push({
          row: item.rowNum,
          policyNumber: p.policyNumber,
          errors: [`Could not link policy to user '${p.email}' (Missing User ID)`]
        });
        continue;
      }
      if (!p.accountId) {
        console.error(`[IMPORT WORKER] [INTEGRITY ERROR] Row ${item.rowNum}: Missing accountId for policy ${p.policyNumber}`);
        summary.failed++;
        validationErrors.push({
          row: item.rowNum,
          policyNumber: p.policyNumber,
          errors: [`Could not link policy to account '${p.accountName}' (Missing Account ID)`]
        });
        continue;
      }
      if (!p.categoryId) {
        console.error(`[IMPORT WORKER] [INTEGRITY ERROR] Row ${item.rowNum}: Missing categoryId for policy ${p.policyNumber}`);
        summary.failed++;
        validationErrors.push({
          row: item.rowNum,
          policyNumber: p.policyNumber,
          errors: [`Could not link policy to category '${p.categoryName}' (Missing Category ID)`]
        });
        continue;
      }
      if (!p.companyId) {
        console.error(`[IMPORT WORKER] [INTEGRITY ERROR] Row ${item.rowNum}: Missing companyId for policy ${p.policyNumber}`);
        summary.failed++;
        validationErrors.push({
          row: item.rowNum,
          policyNumber: p.policyNumber,
          errors: [`Could not link policy to carrier '${p.companyName}' (Missing Carrier ID)`]
        });
        continue;
      }

      const policyDoc = {
        policyNumber: p.policyNumber,
        policyStartDate: p.policyStartDate,
        policyEndDate: p.policyEndDate,
        policyMode: p.policyMode,
        policyType: p.policyType,
        premiumAmount: p.premiumAmount,
        premiumAmountWritten: p.premiumAmountWritten,
        agentId: p.agentId,
        producer: p.producer,
        csr: p.csr,
        accountId: p.accountId,
        categoryId: p.categoryId,
        companyId: p.companyId,
        userId: p.userId,
        primary: p.primary,
        applicantId: p.applicantId,
        agencyId: p.agencyId,
        hasActiveClientPolicy: p.hasActiveClientPolicy
      };

      policyBulkOps.push({
        updateOne: {
          filter: { policyNumber: p.policyNumber },
          update: { $set: policyDoc },
          upsert: true
        }
      });
    }

    if (policyBulkOps.length > 0) {
      const bulkResult = await Policy.bulkWrite(policyBulkOps, { ordered: false });
      summary.inserted = bulkResult.upsertedCount || 0;
      summary.updated = bulkResult.modifiedCount || 0;
      summary.insertedCounts.policies = summary.inserted;
      const matchedCount = bulkResult.matchedCount || 0;
      const unchanged = matchedCount - summary.updated;
      summary.processed = summary.inserted + summary.updated + unchanged;
      console.log(
        `[IMPORT WORKER] [INSERT] 'policies' bulk write complete: ${summary.inserted} inserted, ${summary.updated} updated, ${unchanged} unchanged.`
      );
    } else {
      summary.processed = 0;
      console.warn(`[IMPORT WORKER] [INSERT] No valid policies were prepared for bulk write.`);
    }

    // 7b. Automatically generate and insert Scheduled Messages for imported policies into 'scheduledmessages'
    const messageBulkOps = [];
    const seenMessages = new Set();

    for (const item of validRows) {
      const p = item.parsed;
      if (!p.policyNumber) continue;

      const clientName = p.firstName || 'Client';
      const msgText = `Policy renewal reminder for policy ${p.policyNumber} (${clientName}) - Carrier: ${p.companyName || 'General Insurance'}`;
      if (seenMessages.has(msgText)) continue;
      seenMessages.add(msgText);

      let scheduledDate = null;
      if (p.policyEndDate) {
        const d = new Date(p.policyEndDate);
        d.setDate(d.getDate() - 30);
        if (!isNaN(d.getTime())) {
          scheduledDate = d;
        }
      }
      if (!scheduledDate || isNaN(scheduledDate.getTime())) {
        scheduledDate = new Date(Date.now() + 86400000 * 30);
      }

      messageBulkOps.push({
        updateOne: {
          filter: { message: msgText },
          update: {
            $setOnInsert: {
              message: msgText,
              scheduledAt: scheduledDate,
              status: 'PENDING'
            }
          },
          upsert: true
        }
      });
    }

    if (messageBulkOps.length > 0) {
      const msgResult = await ScheduledMessage.bulkWrite(messageBulkOps, { ordered: false });
      summary.insertedCounts.scheduledMessages = msgResult.upsertedCount || 0;
      console.log(
        `[IMPORT WORKER] [INSERT] 'scheduledmessages' bulk write complete: ${summary.insertedCounts.scheduledMessages} inserted.`
      );
    }

    // 8. Count Total Entities in Database Across All 7 Collections
    const [totalAgents, totalUsers, totalAccounts, totalCategories, totalCarriers, totalPolicies, totalMessages] = await Promise.all([
      Agent.countDocuments(),
      User.countDocuments(),
      Account.countDocuments(),
      PolicyCategory.countDocuments(),
      PolicyCarrier.countDocuments(),
      Policy.countDocuments(),
      ScheduledMessage.countDocuments()
    ]);

    console.log(`\n===============================================================`);
    console.log(`[IMPORT WORKER] [VERIFY] Total Document Counts in Database:`);
    console.log(`  - agents:            ${totalAgents}`);
    console.log(`  - users:             ${totalUsers}`);
    console.log(`  - accounts:          ${totalAccounts}`);
    console.log(`  - policycategories:  ${totalCategories}`);
    console.log(`  - policycarriers:    ${totalCarriers}`);
    console.log(`  - policies:          ${totalPolicies}`);
    console.log(`  - scheduledmessages: ${totalMessages}`);
    console.log(`===============================================================\n`);

    // 9. Send success message to parent thread
    parentPort.postMessage({
      success: true,
      summary,
      entities: {
        agents: totalAgents,
        users: totalUsers,
        accounts: totalAccounts,
        categories: totalCategories,
        carriers: totalCarriers,
        policies: totalPolicies,
        scheduledMessages: totalMessages
      },
      validationErrors
    });
  } catch (error) {
    console.error(`[IMPORT WORKER] [FATAL ERROR] Import failed:`, error);
    parentPort.postMessage({
      success: false,
      error: error.message,
      stack: error.stack
    });
  } finally {
    // Delete temporary uploaded file safely
    try {
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`[IMPORT WORKER] [CLEANUP] Deleted temporary file: ${filePath}`);
      }
    } catch (_) {}

    // Disconnect Mongoose in worker thread
    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
        console.log(`[IMPORT WORKER] [CLEANUP] Worker disconnected from MongoDB.`);
      }
    } catch (_) {}
  }
}

processImport();
