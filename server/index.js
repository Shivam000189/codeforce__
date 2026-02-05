const app = require('./src/app');
const connectDB = require('./src/config/db');
require('dotenv').config();

const PORT = process.env.PORT || 5001;

connectDB();


app.listen(PORT, () => {
    console.log(`Server is running in port ${PORT}`);
})


