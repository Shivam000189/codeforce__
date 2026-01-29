const mongoose = require('mongoose');

const Submission = require("../models/submission");


async function  judgeSubmission(submissionId) {
    try{
        const submission = await Submission.findById(submissionId);


        if(!submission){
            throw new Error('Submission not Found');
        }

        let finalCall = 'incorrect';

        if(submission.sourceCode.length > 20){
            finalCall = 'correct';
        }
        
        submission.status = finalCall;

        await submission.save();


        console.log(`Submission ${submissionId} judge as ${finalCall}`);
    } catch(error){
        console.log('Judge error:', error.message);
    }
}


module.exports = { judgeSubmission };


