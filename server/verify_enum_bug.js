const mongoose = require('mongoose');
const { judgeSubmission } = require('./src/services/judge.service');
const Submission = require('./src/models/submission');
const User = require('./src/models/User'); // Assuming case might be sensitive or file name varies, checking require
// Note: In controller it was 'User' but file system search showed 'models/User' might be implied. 
// I'll check file list again if this fails.
// Actually standard finding is 'models/submission' (lowercase) but 'User' (Titlecase)?
// Let's assume standard import for now or mocks.

// We need a connected DB
const connectDB = require('./src/config/db');

async function run() {
    try {
        await connectDB();

        // Mock a submission since creating full relational objects might be tedious
        // We'll create a submission document directly.
        // But wait, we need a valid user and problem ID usually for required fields.
        // Let's try to bypass validation or create minimal objects.

        const user = new mongoose.Types.ObjectId();
        const problem = new mongoose.Types.ObjectId();

        const submission = await Submission.create({
            user: user,
            problem: problem,
            sourceCode: "int main() { return 0; }", // > 20 chars
            language: "cpp",
            status: "pending"
        });

        console.log("Submission created:", submission._id);

        console.log("Running judge...");
        try {
            await judgeSubmission(submission._id);
            console.log("Judge completed successfully (Unexpected)");
        } catch (e) {
            console.log("Judge failed as expected:", e.message);
        }

    } catch (e) {
        console.error("Setup failed:", e);
    } finally {
        await mongoose.disconnect();
    }
}

run();
