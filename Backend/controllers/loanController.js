const { db } = require('../config/db');

exports.getAll = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM LOAN_REQUEST ORDER BY LoanID DESC');
        res.json(rows);
    } catch (err) {
        console.error('Loan getAll error:', err.message);
        res.status(500).json({ error: err.message });
    }
};

exports.getById = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM LOAN_REQUEST WHERE LoanID = ?', [req.params.id]);
        if (!rows.length) return res.status(404).json({ error: 'Loan not found' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.create = async (req, res) => {
    try {
        const { Cust_ID, Requested_Amount, LoanRate, TenureMonths, PickupDate, PickupLocation } = req.body;
        const [result] = await db.query(
            `INSERT INTO LOAN_REQUEST (Cust_ID, Requested_Amount, LoanRate, TenureMonths, ApprovalStatus, PickupDate, PickupLocation)
             VALUES (?, ?, ?, ?, 'PENDING', ?, ?)`,
            [Cust_ID, Requested_Amount, LoanRate || 0, TenureMonths || 12, PickupDate || null, PickupLocation || null]
        );
        res.status(201).json({ message: 'Loan request created', id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateStatus = async (req, res) => {
    try {
        const { status } = req.body;
        await db.query('UPDATE LOAN_REQUEST SET ApprovalStatus = ? WHERE LoanID = ?', [status, req.params.id]);
        await db.query(
            `INSERT INTO AUDIT_LOG_ENTRY (Event, Reference, LogDetails, Officer) VALUES (?, ?, ?, ?)`,
            ['ADMIN', `LN${String(req.params.id).padStart(4,'0')}`, `Loan LN${String(req.params.id).padStart(4,'0')} ${status}`, 'EMP1001']
        );
        res.json({ message: 'Loan status updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getTermDetails = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM LOAN_TERM_DETAIL WHERE LoanID = ?', [req.params.id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.addTermDetail = async (req, res) => {
    try {
        const { noOfDays, NewTerms, CancellationReason } = req.body;
        const [result] = await db.query(
            'INSERT INTO LOAN_TERM_DETAIL (LoanID, noOfDays, NewTerms, CancellationReason) VALUES (?, ?, ?, ?)',
            [req.params.id, noOfDays, NewTerms, CancellationReason]
        );
        res.status(201).json({ message: 'Term detail added', id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
