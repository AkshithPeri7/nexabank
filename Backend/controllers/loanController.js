const { db } = require('../config/db');

exports.getAll = async (req, res) => {
    try {
        const query = `
            SELECT 
                L.*, 
                CONCAT(C.FName, ' ', COALESCE(C.LName, '')) AS CustName,
                (SELECT Account_No FROM ACCOUNT WHERE CustID = L.Cust_ID LIMIT 1) AS Account_No
            FROM LOAN_REQUEST L
            LEFT JOIN BANK_CUSTOMER C ON L.Cust_ID = C.Cust_ID
            ORDER BY L.LoanID DESC
        `;
        const [rows] = await db.query(query);
        res.json(rows);
    } catch (err) {
        console.error('Loan getAll error:', err.message);
        res.status(500).json({ error: err.message });
    }
};

exports.getById = async (req, res) => {
    try {
        const query = `
            SELECT 
                L.*, 
                CONCAT(C.FName, ' ', COALESCE(C.LName, '')) AS CustName,
                (SELECT Account_No FROM ACCOUNT WHERE CustID = L.Cust_ID LIMIT 1) AS Account_No
            FROM LOAN_REQUEST L
            LEFT JOIN BANK_CUSTOMER C ON L.Cust_ID = C.Cust_ID
            WHERE L.LoanID = ?
        `;
        const [rows] = await db.query(query, [req.params.id]);
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
        
        if (status === 'APPROVED') {
            const [loans] = await db.query('SELECT * FROM LOAN_REQUEST WHERE LoanID = ?', [req.params.id]);
            const loan = loans[0];
            if (loan && loan.TenureMonths && loan.LoanRate) {
                const P = parseFloat(loan.Requested_Amount);
                let r = parseFloat(loan.LoanRate);
                if (r === 0) r = 9.5; // Default fallback rate
                r = r / (12 * 100);
                const n = parseInt(loan.TenureMonths);
                
                const emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
                let remainingP = P;
                let emiDate = new Date();
                
                for (let i = 1; i <= n; i++) {
                    emiDate.setMonth(emiDate.getMonth() + 1);
                    const intComp = remainingP * r;
                    const prinComp = emi - intComp;
                    remainingP -= prinComp;
                    
                    await db.query(
                        `INSERT INTO LOAN_EMI_SCHEDULE (LoanID, DueDate, EMIAmount, PrincipalComponent, InterestComponent) VALUES (?, ?, ?, ?, ?)`,
                        [req.params.id, emiDate, emi.toFixed(2), prinComp.toFixed(2), intComp.toFixed(2)]
                    );
                }
            }
        }
        
        try {
            await db.query(
                `INSERT INTO AUDIT_LOG_ENTRY (LogType, TxnID, LogDetails) VALUES (?, ?, ?)`,
                ['LOAN_APPROVAL', null, `Loan ${req.params.id} ${status}`]
            );
        } catch(e) {}
        
        res.json({ message: 'Loan status updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getEMIs = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM LOAN_EMI_SCHEDULE WHERE LoanID = ? ORDER BY DueDate ASC', [req.params.id]);
        res.json(rows);
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
