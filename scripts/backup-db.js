const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/insurance';

async function performBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupBaseDir = path.resolve(process.cwd(), 'backups');
  const backupDir = path.join(backupBaseDir, `backup-${timestamp}`);
  const latestDir = path.join(backupBaseDir, 'latest');

  // Ensure directories exist
  fs.mkdirSync(backupDir, { recursive: true });
  fs.mkdirSync(latestDir, { recursive: true });

  console.log('===============================================================');
  console.log('           DATABASE BACKUP UTILITY (MONGODB)                   ');
  console.log('===============================================================');
  console.log(`- Connection URI: ${mongoUri.replace(/\/\/.*@/, '//***:***@')}`);
  console.log(`- Backup Directory: ${backupDir}`);
  console.log(`- Started At: ${new Date().toLocaleString()}`);
  console.log('---------------------------------------------------------------');

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000
    });
    console.log('[CONNECT] Successfully connected to MongoDB database.\n');

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();

    if (collections.length === 0) {
      console.log('[WARN] No collections found in the database to backup.');
      await mongoose.disconnect();
      return;
    }

    const manifest = {
      database: db.databaseName,
      createdAt: new Date().toISOString(),
      timestamp,
      collections: {},
      totalDocuments: 0,
      totalSizeBytes: 0
    };

    console.log(`Found ${collections.length} collection(s) to export:\n`);

    for (const colInfo of collections) {
      const colName = colInfo.name;
      // Skip system collections if any
      if (colName.startsWith('system.')) continue;

      const collection = db.collection(colName);
      const count = await collection.countDocuments();
      const indexes = await collection.indexes();

      console.log(`--> Exporting [${colName}]: ${count.toLocaleString()} documents...`);

      const docs = await collection.find({}).toArray();

      const colFilePath = path.join(backupDir, `${colName}.json`);
      const latestFilePath = path.join(latestDir, `${colName}.json`);

      const fileData = JSON.stringify(docs, null, 2);
      fs.writeFileSync(colFilePath, fileData, 'utf8');
      fs.writeFileSync(latestFilePath, fileData, 'utf8');

      const sizeBytes = Buffer.byteLength(fileData, 'utf8');
      manifest.totalDocuments += count;
      manifest.totalSizeBytes += sizeBytes;

      manifest.collections[colName] = {
        documentCount: count,
        sizeBytes,
        sizeFormatted: `${(sizeBytes / 1024).toFixed(2)} KB`,
        indexes
      };
    }

    // Write manifest to both target backup folder and latest
    const manifestPath = path.join(backupDir, 'manifest.json');
    const latestManifestPath = path.join(latestDir, 'manifest.json');
    const manifestJson = JSON.stringify(manifest, null, 2);

    fs.writeFileSync(manifestPath, manifestJson, 'utf8');
    fs.writeFileSync(latestManifestPath, manifestJson, 'utf8');

    console.log('\n===============================================================');
    console.log('                 BACKUP COMPLETED SUCCESSFULLY                  ');
    console.log('===============================================================');
    console.log(`Database:          ${manifest.database}`);
    console.log(`Total Collections: ${Object.keys(manifest.collections).length}`);
    console.log(`Total Documents:   ${manifest.totalDocuments.toLocaleString()}`);
    console.log(`Total Backup Size: ${(manifest.totalSizeBytes / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`Destination:       ${backupDir}`);
    console.log(`Latest Copy:       ${latestDir}`);
    console.log('---------------------------------------------------------------');
    console.log('Collection Breakdown:');
    for (const [name, stats] of Object.entries(manifest.collections)) {
      console.log(`  * ${name.padEnd(20)}: ${stats.documentCount.toString().padStart(6)} records (${stats.sizeFormatted})`);
    }
    console.log('===============================================================');

  } catch (error) {
    console.error('\n[FATAL] Database backup failed:');
    console.error(error);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('\n[DISCONNECT] MongoDB connection closed.');
    }
  }
}

if (require.main === module) {
  performBackup();
}

module.exports = performBackup;
