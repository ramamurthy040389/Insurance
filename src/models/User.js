const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    index: true
  },
  dob: {
    type: Date,
    default: null
  },
  address: {
    type: String,
    default: null,
    trim: true
  },
  city: {
    type: String,
    default: null,
    trim: true
  },
  phone: {
    type: String,
    default: null,
    trim: true
  },
  state: {
    type: String,
    default: null,
    trim: true
  },
  zipCode: {
    type: String,
    default: null,
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    unique: true
  },
  gender: {
    type: String,
    default: null,
    trim: true
  },
  userType: {
    type: String,
    default: 'Active Client',
    trim: true
  }
}, {
  timestamps: true,
  versionKey: false,
  collection: 'users'
});

const User = mongoose.models.User || mongoose.model('User', userSchema, 'users');

module.exports = User;
