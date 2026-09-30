const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/insurance';

async function performRestore(targetFolder) {
  const backupDir = targetFolder 
    ? path.resolve(targetFolder)
    : path.resolve(process.cwd(), 'backups', 'latest');

  console.log('===============================================================');
  console.log('           DATABASE RESTORE UTILITY (MONGODB)                  ');
  console.log('===============================================================');
  console.log(`- Connection URI:  ${mongoUri.replace(/\/\/.*@/, '//***:***@')}`);
  console.log(`- Source Backup:   ${backupDir}`);
  console.log(`- Started At:      ${new Date().toLocaleString()}`);
  console.log('---------------------------------------------------------------');

  const manifestPath = path.join(backupDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifest not found at "${manifestPath}". Please ensure the backup directory exists.`);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  console.log(`[INFO] Restoring database "${manifest.database}" created at ${manifest.createdAt}`);
  console.log(`[INFO] Total records to restore: ${manifest.totalDocuments.toLocaleString()}\n`);

  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.log('[CONNECT] Connected to target MongoDB instance.\n');

    const db = mongoose.connection.db;

    for (const [colName, colMeta] of Object.entries(manifest.collections)) {
      const colFilePath = path.join(backupDir, `${colName}.json`);
      if (!fs.existsSync(colFilePath)) {
        console.warn(`[WARN] Skipping ${colName}: File not found at ${colFilePath}`);
        continue;
      }

      console.log(`--> Restoring collection [${colName}]...`);
      const docs = JSON.parse(fs.readFileSync(colFilePath, 'utf8'));

      const collection = db.collection(colName);
      // Clean existing data in collection before restoring
      await collection.deleteMany({});

      if (docs.length > 0) {
        // Handle MongoDB ObjectId and Date hydration
        const hydratedDocs = docs.map(doc => {
          if (doc._id && typeof doc._id === 'string' && /^[0-9a-fA-F]{24}$/.test(doc._id)) {
            doc._id = new mongoose.Types.ObjectId(doc._id);
          }
          return doc;
        });

        await collection.insertMany(hydratedDocs, { ordered: false });
        console.log(`    ✓ Restored ${hydratedDocs.length.toLocaleString()} documents`);
      } else {
        console.log(`    ✓ Empty collection restored`);
      }

      // Recreate custom indexes (skip default _id index)
      if (colMeta.indexes && colMeta.indexes.length > 1) {
        for (const idx of colMeta.indexes) {
          if (idx.name === '_id_') continue;
          try {
            const indexOptions = { name: idx.name };
            if (idx.unique) indexOptions.unique = true;
            if (idx.background) indexOptions.background = true;
            await collection.createIndex(idx.key, indexOptions);
          } catch (idxErr) {
            // Ignore index collision
          }
        }
        console.log(`    ✓ Rebuilt indexes for [${colName}]`);
      }
    }

    console.log('\n===============================================================');
    console.log('              DATABASE RESTORE COMPLETED SUCCESSFULLY          ');
    console.log('===============================================================');
  } catch (err) {
    console.error('\n[FATAL] Restore failed:');
    console.error(err);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('\n[DISCONNECT] MongoDB connection closed.');
    }
  }
}

if (require.main === module) {
  const customPath = process.argv[2];
  performRestore(customPath);
}

module.exports = performRestore;
