const Submission = require('../models/submission');
const Problem = require('../models/problem');

async function judgeSubmission(submissionId) {
  const submission = await Submission.findById(submissionId).populate('problem');

  if (!submission) throw new Error('Submission not found');


  const testCases = submission.problem.testCases;


  submission.status = 'running';
  await submission.save();

  
    for(const testCase of testCases){
        const fakeOutput = submission.sourceCode.length > 20 ? testCase.output : 'Wrong_output';


        if(fakeOutput.trim() !== testCase.output.trim()){
            submission.status = 'incorrect';
            await submission.save();
            return 'incorrect';

        }
    }


    submission.status = 'correct';
    await submission.save();
    return 'correct';
}

module.exports = { judgeSubmission };
