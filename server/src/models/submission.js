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
  results: [
    {
      input: String,
      expectedOutput: String,
      actualOutput: String,
      passed: Boolean,
      error: String,
      executionTime: Number
    }
  ]
}, { timestamps: true });


submissionSchema.index({ user: 1 });
submissionSchema.index({ problem: 1 });
submissionSchema.index({ status: 1 });
submissionSchema.index({ createdAt: -1 }); // newest submissions first

module.exports = mongoose.model('Submission', submissionSchema);