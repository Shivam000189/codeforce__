// services/judge.service.js
const Submission = require("../models/submission");

async function judgeSubmission(submissionId) {
  const submission = await Submission.findById(submissionId);

  if (!submission) {
    throw new Error("Submission not found");
  }

  const codeLength = submission.sourceCode.length;

  if (codeLength > 20) {
    submission.status = "accepted";
    submission.verdict = "Correct Answer";
  } else {
    submission.status = "wrong_answer";
    submission.verdict = "Wrong Answer";
  }

  await submission.save();

  return submission;
}

module.exports = { judgeSubmission };
