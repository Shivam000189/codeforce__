const mongoose = require('mongoose');

const problemSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  statement: { type: String, required: true },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
  tags: {
    type: [{ type: String, trim: true }],
    default: []
  },
  timeLimit: {
    type: Number,
    default: 2000, // in milliseconds (e.g. 2000ms = 2s)
    min: 100,
    max: 15000
  },
  memoryLimit: {
    type: Number,
    default: 256, // in Megabytes (e.g. 256MB)
    min: 16,
    max: 2048
  },
  constraints: {
    type: String,
    default: '',
    trim: true
  },
  editorial: {
    type: String,
    default: '',
    trim: true
  },
  testCases: {
    type: [
      {
        input: String,
        output: String,
        isSample: { type: Boolean, default: false }
      }
    ],
    default: []
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

problemSchema.index({ createdBy: 1 });
problemSchema.index({ difficulty: 1 });
problemSchema.index({ tags: 1 });
problemSchema.index({ createdAt: -1 });
problemSchema.index({ title: 'text' });

module.exports = mongoose.model('Problem', problemSchema);