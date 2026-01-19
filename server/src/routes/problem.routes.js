const authMiddleware = require("../middlewares/authMiddleware");

router.post('/create-problem', authMiddleware, problemController.create);