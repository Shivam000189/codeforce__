const mongoose = require('mongoose');

const connectDB = async () => {
    try{
        const mongourl = process.env.MONGO_URL || "mongodb://localhost:27017/codeforces_mvp";
        await mongoose.connect(mongourl);
        console.log('Mongodb connected');
    }catch(error){
        console.error('DB connection failed', error.message);
        process.exit(1);
    }

    // try{
    //     await mongoose.connect("mongodb://localhost:27017/codeforces_mvp");
    //     console.log('MongoDB connected');
    // }catch(error){
    //     console.error('DB connection failed', error.message);
    //     process.exit(1);
    // }
}

module.exports = connectDB;
