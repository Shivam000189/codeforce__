const express = require('express');
const app = express();
const authRoutes = require('./routes/auth.routes');
// const proRoutes = require('./routes/problem.routes');
const subRoutes = require('./routes/submission.routes');



app.use(express.json());
app.use('/api/auth', authRoutes);


app.use('/', subRoutes);







app.get('/', (req, res )=> {
    res.send('Codeforce');
})

module.exports = app;