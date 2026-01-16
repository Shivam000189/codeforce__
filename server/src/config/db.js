const mongoose = require('mongoose');

const connectDB = async () => {
    try{
        await mongoose.connect("mongodb://localhost:27017/codeforces_mvp");
        console.log('MongoDB connected');
    }catch(error){
        console.error('DB connection failed', error.message);
        process.exit(1);
    }
}

module.exports = connectDB;
