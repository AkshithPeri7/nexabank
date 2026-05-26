const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const app = express();
app.use(cors({
    origin: function(origin, callback) {
        callback(null, true);
    },
    credentials: true
}));
app.use(express.json());

const { initDatabase } = require('./config/db');

// Boot: auto-create DB & tables, then start listening
initDatabase()
    .then(() => {
        // Routes — mounted after DB is ready
        app.use('/api/auth',         require('./routes/auth'));
        app.use('/api/employees',    require('./routes/employee'));
        app.use('/api/customers',    require('./routes/customer'));
        app.use('/api/accounts',     require('./routes/account'));
        app.use('/api/transactions', require('./routes/transaction'));
        app.use('/api/loans',        require('./routes/loan'));
        app.use('/api/payments',     require('./routes/payment'));
        app.use('/api/beneficiaries', require('./routes/beneficiary'));
        app.use('/api/fixed-deposits', require('./routes/fixedDeposit'));
        app.use('/api/audit',        require('./routes/audit'));
        app.use('/api/credit-cards', require('./routes/creditCard'));
        app.use('/api/investments',  require('./routes/investment'));
        app.get('/', (req, res) => res.json({ status: 'NexaBank API Running ✅', port: PORT }));

        const PORT = process.env.PORT || 5000;
        app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
    })
    .catch(err => {
        console.error('❌ Failed to initialise database:', err.message);
        console.error('   → Check your MySQL credentials in Backend/.env');
        console.error('   → Make sure MySQL service is running.');
        process.exit(1);
    });