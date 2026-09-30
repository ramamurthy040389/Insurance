const mongoose = require('mongoose');

const agentSchema = new mongoose.Schema({
  agent_name: {
    type: String,
    required: [true, 'Agent name is required'],
    trim: true,
    unique: true
  }
}, {
  timestamps: true,
  versionKey: false,
  collection: 'agents'
});

const Agent = mongoose.models.Agent || mongoose.model('Agent', agentSchema, 'agents');

module.exports = Agent;
