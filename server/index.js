const express = require('express');
const app = express();

app.use(express.json());



app.get('/', (req, res )=> {
    res.send('Codeforce');
})


app.listen(5001,  () => {
    console.log('Server is running ');
})


