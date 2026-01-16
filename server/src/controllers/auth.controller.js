

exports.register = (req, res) => {
    const {name, email, password} = req.body;

    if(!email || !password || !name) {
        return console.log('Details are invalid');
    }

    return res.json({
        message: "User registered successfully",
        data:{name , email}
    });
}


exports.login = (req, res) => {
    const {email, password} = req.body;


    if(!email || !password) {
        return console.log('Details are invalid');
    }


    return res.json({
        message:"User login Succesfully",
        email
    });
};






