require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/database');

const port = process.env.PORT || 3000;

// Connect to MongoDB before starting server
connectDB().then(() => {
    app.listen(port, () => {
        console.log(`🚀 Server running on port ${port}`);
    });
}).catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
