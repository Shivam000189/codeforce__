const express = require('express');
const app = express();
const authRoutes = require('./routes/auth.routes');
const proRoutes = require('./routes/problem.routes');
const subRoutes = require('./routes/submission.routes');
const judgeRoute = require('./routes/judge.routes');




app.use(express.json());
app.use('/api/auth', authRoutes);



app.use('/api/submission', subRoutes);
app.use('/api/problem', proRoutes);


app.use('/api/judge', judgeRoute);




app.get('/', (req, res )=> {
    res.send('Codeforce');
})

module.exports = app;