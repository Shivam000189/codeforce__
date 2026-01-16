const User = require('../models/User');
const bcrypt = require('bcryptjs')


exports.register = async (req, res) => {
    const {name, email, password} = req.body;

    const userExists = await User.findOne({email});

    if(userExists) {
        return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);


    const user = await User.create({
        name,
        email,
        password:hashedPassword
    });


    return res.status(201).json({
        message:"User register Successfully",
        userId: user._id
    });
};


exports.login = async (req, res) => {
    const {email, password} = req.body;


    if(!email || !password) {
        return res.status(400).json({msg:"Invalid field"});
    }
    const user = await User.findOne({email});

    if(!user) return res.status(401).json({msg:"Invald email"});

    const isMatch = await bcrypt.compare(password, user.password);
    if(!isMatch){
        return res.status(401).json({msg:"Invalid email or password"})
    }

    return res.json({
        message:"User login Succesfully",
        email
    });
};






