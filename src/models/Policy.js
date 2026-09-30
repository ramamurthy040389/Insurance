const mongoose = require('mongoose');

const policySchema = new mongoose.Schema({
  policyNumber: {
    type: String,
    required: [true, 'Policy number is required'],
    trim: true,
    unique: true
  },
  policyStartDate: {
    type: Date,
    required: [true, 'Policy start date is required'],
    index: true
  },
  policyEndDate: {
    type: Date,
    required: [true, 'Policy end date is required'],
    index: true
  },
  policyMode: {
    type: String,
    default: null,
    trim: true
  },
  policyType: {
    type: String,
    default: null,
    trim: true
  },
  premiumAmount: {
    type: Number,
    default: null
  },
  premiumAmountWritten: {
    type: Number,
    default: null
  },
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    default: null,
    index: true
  },
  producer: {
    type: String,
    default: null,
    trim: true
  },
  csr: {
    type: String,
    default: null,
    trim: true
  },
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: [true, 'Account ID reference is required'],
    index: true
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PolicyCategory',
    required: [true, 'Category ID reference is required'],
    index: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PolicyCarrier',
    required: [true, 'Company/Carrier ID reference is required'],
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID reference is required'],
    index: true
  },
  // Additional preserved source fields
  primary: {
    type: String,
    default: null,
    trim: true
  },
  applicantId: {
    type: String,
    default: null,
    trim: true
  },
  agencyId: {
    type: String,
    default: null,
    trim: true
  },
  hasActiveClientPolicy: {
    type: String,
    default: null,
    trim: true
  }
}, {
  timestamps: true,
  versionKey: false,
  collection: 'policies'
});

const Policy = mongoose.models.Policy || mongoose.model('Policy', policySchema, 'policies');

module.exports = Policy;
