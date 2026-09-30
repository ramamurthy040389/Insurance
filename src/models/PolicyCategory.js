const mongoose = require('mongoose');

const policyCategorySchema = new mongoose.Schema({
  categoryName: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    unique: true
  }
}, {
  timestamps: true,
  versionKey: false,
  collection: 'policycategories'
});

const PolicyCategory = mongoose.models.PolicyCategory || mongoose.model('PolicyCategory', policyCategorySchema, 'policycategories');

module.exports = PolicyCategory;
