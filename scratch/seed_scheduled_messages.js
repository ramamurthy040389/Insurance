const mongoose = require('mongoose');
const { Policy, ScheduledMessage, User } = require('../src/models');

async function seedMessages() {
  await mongoose.connect('mongodb://127.0.0.1:27017/insurance');
  console.log('Connected to MongoDB');

  const policies = await Policy.find({}).populate('userId').lean();
  console.log('Found policies:', policies.length);

  const ops = [];
  const seen = new Set();

  for (const p of policies) {
    if (!p.policyNumber) continue;
    const clientName = (p.userId && p.userId.firstName) ? p.userId.firstName : 'Client';
    const msgText = `Policy renewal reminder for policy ${p.policyNumber} (${clientName})`;
    if (seen.has(msgText)) continue;
    seen.add(msgText);

    let scheduledDate = null;
    if (p.policyEndDate) {
      const d = new Date(p.policyEndDate);
      d.setDate(d.getDate() - 30);
      if (!isNaN(d.getTime())) scheduledDate = d;
    }
    if (!scheduledDate) {
      scheduledDate = new Date(Date.now() + 86400000 * 30);
    }

    ops.push({
      updateOne: {
        filter: { message: msgText },
        update: {
          $setOnInsert: {
            message: msgText,
            scheduledAt: scheduledDate,
            status: scheduledDate < new Date() ? 'COMPLETED' : 'PENDING',
            processedAt: scheduledDate < new Date() ? new Date() : null
          }
        },
        upsert: true
      }
    });
  }

  console.log(`Executing bulkWrite for ${ops.length} messages...`);
  const res = await ScheduledMessage.bulkWrite(ops, { ordered: false });
  console.log(`Upserted: ${res.upsertedCount}, Matched: ${res.matchedCount}`);

  const total = await ScheduledMessage.countDocuments();
  console.log(`Total documents in scheduledmessages collection now: ${total}`);

  await mongoose.disconnect();
}

seedMessages().catch(console.error);
