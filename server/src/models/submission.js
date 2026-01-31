// models/submission.js
const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema({
  problem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Problem",
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  language: String,
  sourceCode: String,

  status: {
    type: String,
    enum: ["pending", "running", "accepted", "wrong_answer", "error"],
    default: "pending"
  },

  verdict: String
}, { timestamps: true });

module.exports = mongoose.model("Submission", submissionSchema);
