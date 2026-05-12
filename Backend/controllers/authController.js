const { db } = require('../config/db');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');

// ─── SIGN UP ──────────────────────────────────────────────────────
exports.signup = async (req, res) => {
    try {
        const { type, fName, lName, email, phone, dob, address, idProof, accountType, deposit, password } = req.body;

        if (!fName || !password)      return res.status(400).json({ error: 'First name and password are required.' });
        if (password.length < 8)      return res.status(400).json({ error: 'Password must be at least 8 characters.' });

        const passwordHash = await bcrypt.hash(password, 10);

        if (type === 'employee') {
            const [r] = await db.query(
                `INSERT INTO BANK_EMPLOYEE (Name, LName, PasswordHash) VALUES (?, ?, ?)`,
                [fName, lName || '', passwordHash]
            );
            return res.status(201).json({ message: 'Employee registered.', id: r.insertId });
        }

        // Customer
        const [custR] = await db.query(
            `INSERT INTO BANK_CUSTOMER (FName, LName, Email, ContactNo, CustDOB, Address, CustIDProofType, CustomerType, PasswordHash)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'INDIVIDUAL', ?)`,
            [fName, lName || '', email || null, phone || null, dob || null, address || null, idProof || 'AADHAAR', passwordHash]
        );
        const custId = custR.insertId;

        // Auto-create linked bank account
        await db.query(
            `INSERT INTO ACCOUNT (CustID, AccountType, Balance) VALUES (?, ?, ?)`,
            [custId, accountType || 'SAVINGS', parseFloat(deposit) || 500]
        );

        return res.status(201).json({ message: `NexaBank ${accountType || 'SAVINGS'} account opened successfully!`, id: custId });
    } catch (err) {
        console.error('Signup Error:', err.message);
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
};

// ─── LOGIN ────────────────────────────────────────────────────────
exports.login = async (req, res) => {
    try {
        const { type, fName, password } = req.body;
        if (!type || !fName || !password) return res.status(400).json({ error: 'All fields are required.' });

        const table     = type === 'employee' ? 'BANK_EMPLOYEE' : 'BANK_CUSTOMER';
        const nameField = type === 'employee' ? 'Name' : 'FName';
        const idField   = type === 'employee' ? 'EID' : 'Cust_ID';

        let query = `SELECT * FROM ${table} WHERE ${nameField} = ? LIMIT 1`;
        let params = [fName];

        if (!isNaN(fName)) {
            query = `SELECT * FROM ${table} WHERE ${idField} = ? OR ${nameField} = ? LIMIT 1`;
            params = [parseInt(fName), fName];
        }

        const [rows] = await db.query(query, params);
        if (!rows.length) return res.status(400).json({ error: 'No account found. Please sign up first.' });

        const user = rows[0];
        if (!user.PasswordHash) return res.status(400).json({ error: 'No password set. Please re-register.' });

        const isMatch = await bcrypt.compare(password, user.PasswordHash);
        if (!isMatch) return res.status(400).json({ error: 'Incorrect password.' });

        const userId = type === 'employee' ? user.EID : user.Cust_ID;
        const token  = jwt.sign({ id: userId, type }, process.env.JWT_SECRET || 'nexabank_2024', { expiresIn: '8h' });

        if (type === 'employee') {
            try {
                await db.query(
                    `INSERT INTO AUDIT_LOG_ENTRY (Event, Reference, LogDetails, Officer) VALUES (?, ?, ?, ?)`,
                    ['LOGIN', '—', `${user[nameField]} logged in`, `EMP${userId}`]
                );
            } catch(e) { console.error('Audit log error:', e); }
        }

        res.json({ token, message: 'Logged in successfully.', user: { fName: user[nameField], lName: user.LName, id: userId } });
    } catch (err) {
        console.error('Login Error:', err.message);
        res.status(500).json({ error: 'Server error during login.' });
    }
};

// ─── GOOGLE LOGIN (SUPABASE) ──────────────────────────────────────
exports.googleLogin = async (req, res) => {
    try {
        const { email, fName, lName, contactNo, initialDeposit } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required from Google Auth.' });

        // 1. Check if user exists
        const [rows] = await db.query(`SELECT * FROM BANK_CUSTOMER WHERE Email = ? LIMIT 1`, [email]);
        
        let userId;
        let firstName = fName || 'User';
        let lastName = lName || '';
        let isNewUser = false;

        if (rows.length > 0) {
            // Existing user — just log them in
            userId = rows[0].Cust_ID;
            firstName = rows[0].FName;
            lastName = rows[0].LName;
        } else {
            // New user — register them
            isNewUser = true;
            const [custR] = await db.query(
                `INSERT INTO BANK_CUSTOMER (FName, LName, Email, ContactNo, CustomerType) VALUES (?, ?, ?, ?, 'INDIVIDUAL')`,
                [firstName, lastName, email, contactNo || null]
            );
            userId = custR.insertId;

            // Create a savings account with initial deposit (default ₹500 if not provided)
            const balance = parseFloat(initialDeposit) || 500;
            await db.query(
                `INSERT INTO ACCOUNT (CustID, AccountType, Balance) VALUES (?, 'SAVINGS', ?)`,
                [userId, balance]
            );
        }

        // Generate JWT Token
        const token = jwt.sign({ id: userId, type: 'customer' }, process.env.JWT_SECRET || 'nexabank_2024', { expiresIn: '8h' });

        res.json({ token, isNewUser, message: 'Google Login successful.', user: { fName: firstName, lName: lastName, id: userId } });
    } catch (err) {
        console.error('Google Login Error:', err.message);
        res.status(500).json({ error: 'Server error during Google login.' });
    }
};
