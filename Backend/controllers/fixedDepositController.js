const db = require('../config/db');

exports.getFDs = async (req, res) => {
    try {
        const { custId } = req.params;
        const [rows] = await db.query('SELECT * FROM FIXED_DEPOSIT WHERE Cust_ID = ?', [custId]);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error fetching FDs' });
    }
};

exports.createFD = async (req, res) => {
    try {
        const { custId } = req.params;
        const { Principal, TenureMonths } = req.body;
        
        // Basic interest rate logic based on tenure
        let rate = 5.0; // Base rate
        if (TenureMonths >= 12) rate = 6.5;
        if (TenureMonths >= 36) rate = 7.0;
        if (TenureMonths >= 60) rate = 7.5;
        
        // Maturity calculation (Simple Interest for this project)
        const principalNum = parseFloat(Principal);
        const maturityAmount = principalNum + (principalNum * rate * (TenureMonths / 12) / 100);
        
        const startDate = new Date();
        const maturityDate = new Date();
        maturityDate.setMonth(maturityDate.getMonth() + parseInt(TenureMonths));

        const [result] = await db.query(
            `INSERT INTO FIXED_DEPOSIT 
            (Cust_ID, Principal, InterestRate, TenureMonths, StartDate, MaturityDate, MaturityAmount) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [custId, principalNum, rate, TenureMonths, startDate, maturityDate, maturityAmount]
        );
        
        res.status(201).json({ 
            message: 'Fixed Deposit created successfully', 
            FD_ID: result.insertId,
            MaturityAmount: maturityAmount
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error creating FD' });
    }
};
