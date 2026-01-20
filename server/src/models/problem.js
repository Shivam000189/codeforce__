const mongoose = require('mongoose');

const problemSchema = new mongoose.Schema({
    title:{type:String, required:true, trim:true},
    statement:{type:String, required:true},
    difficulty:{type:String, enum:['easy', 'medium', 'hard'], required:true},
    testCases:[
        {
            input:String,
            output:String,
            isSample:{
                type:Boolean,
                default:false
            }
        }
    ],
    createdBy:{
        type:mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required:true
    }

},
    {timestamps:true}    
);

module.exports = mongoose.model('Problem', problemSchema);
