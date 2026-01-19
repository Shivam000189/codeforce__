const mongoose = require('mongoose');

const problemSchema = new mongoose.Schema({
    title:{type:String, require:true},
    statement:{type:String, require:true},
    difficulty:{type:String, enum:['easy', 'meduim', 'hard'], require:true},
    testCases:[
        {
            input:String,
            output:String,
            isSample:Boolean
        }
    ]
});


module.exports = mongoose.model('Problem', problemSchema);
