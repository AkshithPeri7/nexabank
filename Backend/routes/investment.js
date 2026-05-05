const express = require('express');
const router = express.Router();
const { db } = require('../config/db');

router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM INVESTMENT ORDER BY CreatedAt DESC');
        res.json(rows);
    } catch(err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
    try {
        const { Cust_ID, InvestType, Amount, DurationMonths } = req.body;
        await db.query(`INSERT INTO INVESTMENT (Cust_ID, InvestType, Amount, DurationMonths) VALUES (?, ?, ?, ?)`, [Cust_ID, InvestType, Amount, DurationMonths]);
        res.status(201).json({ message: 'Investment created successfully' });
    } catch(err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/approve', async (req, res) => {
    try {
        await db.query(`UPDATE INVESTMENT SET Status='ACTIVE' WHERE InvestID=?`, [req.params.id]);
        res.json({ message: 'Approved' });
    } catch(err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/reject', async (req, res) => {
    try {
        await db.query(`UPDATE INVESTMENT SET Status='CLOSED' WHERE InvestID=?`, [req.params.id]);
        await db.query(`INSERT INTO AUDIT_LOG_ENTRY (Event, Reference, LogDetails, Officer) VALUES ('ADMIN', CONCAT('INV', ?), CONCAT('Investment ', ?, ' CLOSED'), 'EMP1001')`, [req.params.id, req.params.id]);
        res.json({ message: 'Rejected' });
    } catch(err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
