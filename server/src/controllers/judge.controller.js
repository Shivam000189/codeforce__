const { judgeSubmission } = require("../services/judge.service");


exports.runJudge = async (req, res) => {
    try{
        const submissionId = req.params.submissionId;

        const result = await judgeSubmission(submissionId);

        res.json({
            message:"Judge Succesfully",
            result
        });
    }catch(err){
        res.status(500).json({
            message:"Judge error",
            error: err.message
        })
    }
}