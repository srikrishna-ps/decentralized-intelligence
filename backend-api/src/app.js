const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();

app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(morgan('dev'));

// Debug logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} from ${req.headers.origin}`);
    next();
});

// Routes
const patientRoutes = require('./routes/patientRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const diagnosticRoutes = require('./routes/diagnosticRoutes');
const insurerRoutes = require('./routes/insurerRoutes');
const adminRoutes = require('./routes/adminRoutes');
const authController = require('./controllers/authController');

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// Auth routes
app.post('/api/auth/signup', authController.signup);
app.get('/api/auth/user', authController.getUser);

// Role-specific routes
app.use('/api/patient', patientRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/diagnostic', diagnosticRoutes);
app.use('/api/insurer', insurerRoutes);
app.use('/api/admin', adminRoutes);
const ipfsRoutes = require('./routes/ipfsRoutes');
app.use('/api/ipfs', ipfsRoutes);

const aiRoutes = require('./routes/aiRoutes');
app.use('/api/ai', aiRoutes);

module.exports = app;
