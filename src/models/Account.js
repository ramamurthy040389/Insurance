const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
  accountName: {
    type: String,
    required: [true, 'Account name is required'],
    trim: true
  },
  accountType: {
    type: String,
    default: null,
    trim: true
  }
}, {
  timestamps: true,
  versionKey: false,
  collection: 'accounts'
});

// Index for account deduplication and lookup by accountName
accountSchema.index({ accountName: 1 });
accountSchema.index({ accountName: 1, accountType: 1 }, { unique: true });

const Account = mongoose.models.Account || mongoose.model('Account', accountSchema, 'accounts');

module.exports = Account;
