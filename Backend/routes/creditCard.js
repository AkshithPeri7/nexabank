const express = require('express');
const router = express.Router();
const { db } = require('../config/db');

router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM CREDIT_CARD_REQUEST ORDER BY CreatedAt DESC');
        res.json(rows);
    } catch(err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
    try {
        const { Cust_ID, CardType, Income } = req.body;
        await db.query(`INSERT INTO CREDIT_CARD_REQUEST (Cust_ID, CardType, Income) VALUES (?, ?, ?)`, [Cust_ID, CardType, Income]);
        res.status(201).json({ message: 'Credit card request submitted' });
    } catch(err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/approve', async (req, res) => {
    try {
        await db.query(`UPDATE CREDIT_CARD_REQUEST SET ApprovalStatus='APPROVED' WHERE CardID=?`, [req.params.id]);
        await db.query(`INSERT INTO AUDIT_LOG_ENTRY (Event, Reference, LogDetails, Officer) VALUES ('ADMIN', CONCAT('CC', ?), CONCAT('Credit Card ', ?, ' APPROVED'), 'EMP1001')`, [req.params.id, req.params.id]);
        res.json({ message: 'Approved' });
    } catch(err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/reject', async (req, res) => {
    try {
        await db.query(`UPDATE CREDIT_CARD_REQUEST SET ApprovalStatus='REJECTED' WHERE CardID=?`, [req.params.id]);
        await db.query(`INSERT INTO AUDIT_LOG_ENTRY (Event, Reference, LogDetails, Officer) VALUES ('ADMIN', CONCAT('CC', ?), CONCAT('Credit Card ', ?, ' REJECTED'), 'EMP1001')`, [req.params.id, req.params.id]);
        res.json({ message: 'Rejected' });
    } catch(err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
