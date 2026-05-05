const { db } = require('../config/db');

exports.getAll = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT t.*, c.FName, c.LName 
            FROM TRANSACTION t 
            LEFT JOIN BANK_CUSTOMER c ON t.CustID = c.Cust_ID 
            ORDER BY t.Transaction_Date DESC
        `);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getById = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM TRANSACTION WHERE Txn_ID = ?', [req.params.id]);
        if (!rows.length) return res.status(404).json({ error: 'Transaction not found' });
        res.json(rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.create = async (req, res) => {
    const { Amount, Transaction_Type, Description, PayMethod, CustID, Account_No } = req.body;
    try {
        const [result] = await db.query(
            `INSERT INTO TRANSACTION (Amount, Transaction_Type, Description, PayMethod, CustID, Account_No)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [Amount, Transaction_Type || 'DEBIT', Description || '', PayMethod || 'NEFT', CustID, Account_No]
        );
        res.status(201).json({ Txn_ID: result.insertId, message: 'Transaction created' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getByCustomer = async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM TRANSACTION WHERE CustID = ? ORDER BY Transaction_Date DESC',
            [req.params.custId]
        );
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
};