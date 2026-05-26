const { db } = require('../config/db');

exports.getByCustId = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM RECURRING_DEPOSIT WHERE Cust_ID = ? ORDER BY StartDate DESC', [req.params.custId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.create = async (req, res) => {
    const { MonthlyInstallment, TenureMonths } = req.body;
    const custId = req.params.custId;
    try {
        let rate = 4.5;
        if(TenureMonths >= 12) rate = 5.5;
        if(TenureMonths >= 24) rate = 6.0;
        if(TenureMonths >= 60) rate = 6.5;

        // Formula for RD maturity: P * n + P * (n*(n+1)/2) * (r/12)/100
        const n = parseInt(TenureMonths);
        const P = parseFloat(MonthlyInstallment);
        const maturityAmount = (P * n) + (P * (n * (n + 1) / 2) * (rate / 12) / 100);

        const startDate = new Date();
        const maturityDate = new Date();
        maturityDate.setMonth(startDate.getMonth() + n);

        const [result] = await db.query(
            `INSERT INTO RECURRING_DEPOSIT (Cust_ID, MonthlyInstallment, InterestRate, TenureMonths, StartDate, MaturityDate, MaturityAmount) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [custId, P, rate, n, startDate, maturityDate, maturityAmount]
        );

        res.status(201).json({ message: 'Recurring Deposit booked successfully', RD_ID: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
