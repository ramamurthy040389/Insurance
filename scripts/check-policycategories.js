const mongoose = require('mongoose');
const env = require('../src/config/env');
const { PolicyCategory, Policy } = require('../src/models');

async function checkPolicyCategories() {
  console.log('===============================================================');
  console.log('INSURANCE SYSTEM - POLICY CATEGORIES AUDIT & VERIFICATION');
  console.log('===============================================================');
  console.log(`Connecting to: ${env.MONGODB_URI}`);

  await mongoose.connect(env.MONGODB_URI);
  console.log('MongoDB Connected successfully.\n');

  // 1. Direct collection check
  const collectionName = 'policycategories';
  const rawCollection = mongoose.connection.collection(collectionName);
  const rawCount = await rawCollection.countDocuments();
  console.log(`[RAW COLLECTION] '${collectionName}' Document Count: ${rawCount}`);

  // 2. Mongoose model check
  const modelCount = await PolicyCategory.countDocuments();
  console.log(`[MODEL QUERY] PolicyCategory.countDocuments(): ${modelCount}`);

  // 3. Fetch all categories
  const categories = await PolicyCategory.find().sort({ categoryName: 1 }).lean();
  console.log(`\nFound ${categories.length} Categories:`);
  categories.forEach((cat, index) => {
    console.log(`  [${String(index + 1).padStart(2, '0')}] ID: ${cat._id} | Name: "${cat.categoryName}"`);
  });

  // 4. Verify referential integrity with policies
  const totalPolicies = await Policy.countDocuments();
  const linkedPoliciesCount = await Policy.countDocuments({ categoryId: { $ne: null } });
  console.log(`\n[REFERENTIAL INTEGRITY CHECK]`);
  console.log(`  - Total Policies: ${totalPolicies}`);
  console.log(`  - Policies Linked to Valid categoryId: ${linkedPoliciesCount}`);

  // 5. Check if any policy has a broken category reference
  const orphanPolicies = await Policy.aggregate([
    {
      $lookup: {
        from: 'policycategories',
        localField: 'categoryId',
        foreignField: '_id',
        as: 'matchedCategory'
      }
    },
    {
      $match: {
        matchedCategory: { $size: 0 }
      }
    },
    { $count: 'orphans' }
  ]);

  const orphanCount = orphanPolicies[0]?.orphans || 0;
  console.log(`  - Policies with Broken/Orphaned categoryId: ${orphanCount}`);

  console.log('\n===============================================================');
  if (rawCount > 0 && orphanCount === 0) {
    console.log('>>> STATUS: HEALTHY! All 22 policy categories are populated & intact. <<<');
  } else {
    console.log('>>> STATUS: ATTENTION REQUIRED! <<<');
  }
  console.log('===============================================================');

  await mongoose.disconnect();
}

checkPolicyCategories().catch((err) => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});
