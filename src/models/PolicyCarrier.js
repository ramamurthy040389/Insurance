const mongoose = require('mongoose');

const policyCarrierSchema = new mongoose.Schema({
  companyName: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true,
    unique: true
  }
}, {
  timestamps: true,
  versionKey: false,
  collection: 'policycarriers'
});

const PolicyCarrier = mongoose.models.PolicyCarrier || mongoose.model('PolicyCarrier', policyCarrierSchema, 'policycarriers');

module.exports = PolicyCarrier;
