const mongoose = require('mongoose');

const problemSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  statement: { type: String, required: true },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
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

module.exports = mongoose.model('Problem', problemSchema);