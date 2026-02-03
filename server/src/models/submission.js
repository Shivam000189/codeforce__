const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  problem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Problem',
    required: true
  },
  sourceCode: {
    type: String,
    required: true
  },
  language: {
    type: String,
    enum: ['c', 'cpp', 'python'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'correct', 'incorrect'],
    default: 'pending'
  },
  output: String,
  error: String,
}, { timestamps: true });


module.exports = mongoose.model('Submission', submissionSchema);