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
    
    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const txType = Transaction_Type || 'DEBIT';

        // Insert Transaction
        const [result] = await connection.query(
            `INSERT INTO TRANSACTION (Amount, Transaction_Type, Description, PayMethod, CustID, Account_No)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [Amount, txType, Description || '', PayMethod || 'NEFT', CustID, Account_No]
        );

        // Update Account Balance
        const operator = txType === 'CREDIT' ? '+' : '-';
        await connection.query(
            `UPDATE ACCOUNT SET Balance = Balance ${operator} ? WHERE Account_No = ?`,
            [Amount, Account_No]
        );

        await connection.commit();
        res.status(201).json({ Txn_ID: result.insertId, message: 'Transaction created and balance updated successfully' });
    } catch (err) { 
        if (connection) await connection.rollback();
        res.status(500).json({ error: err.message }); 
    } finally {
        if (connection) connection.release();
    }
};

exports.transfer = async (req, res) => {
    const { SenderCustID, ReceiverCustID, ReceiverAccountNo, Amount, PayMethod } = req.body;
    
    if (!SenderCustID || !ReceiverAccountNo || !Amount || Amount <= 0) {
        return res.status(400).json({ error: 'Invalid transfer details provided.' });
    }

    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        // 1. Get Sender's primary account
        const [senderAccs] = await connection.query(
            'SELECT Account_No, Balance FROM ACCOUNT WHERE CustID = ? ORDER BY CreatedAt DESC LIMIT 1',
            [SenderCustID]
        );
        if (!senderAccs.length) throw new Error('Sender has no active accounts to transfer from.');
        const senderAccount = senderAccs[0];

        if (senderAccount.Account_No == ReceiverAccountNo) throw new Error('Cannot transfer to the same account.');
        if (senderAccount.Balance < Amount) throw new Error('Insufficient balance for this transfer.');

        // 2. Verify Receiver Account exists
        let receiverQuery = 'SELECT CustID FROM ACCOUNT WHERE Account_No = ?';
        let receiverParams = [ReceiverAccountNo];
        if (ReceiverCustID && ReceiverCustID.trim() !== '') {
            receiverQuery += ' AND CustID = ?';
            receiverParams.push(ReceiverCustID);
        }
        const [receiverAccs] = await connection.query(receiverQuery, receiverParams);
        if (!receiverAccs.length) throw new Error('Invalid receiver account details. Account not found.');
        
        const actualReceiverCustID = receiverAccs[0].CustID;

        // 3. Insert DEBIT for Sender
        await connection.query(
            `INSERT INTO TRANSACTION (Amount, Transaction_Type, Description, PayMethod, CustID, Account_No)
             VALUES (?, 'DEBIT', ?, ?, ?, ?)`,
            [Amount, `Transfer to A/c ${ReceiverAccountNo}`, PayMethod || 'NEFT', SenderCustID, senderAccount.Account_No]
        );

        // 4. Update Sender Balance
        await connection.query(
            `UPDATE ACCOUNT SET Balance = Balance - ? WHERE Account_No = ?`,
            [Amount, senderAccount.Account_No]
        );

        // 5. Insert CREDIT for Receiver
        await connection.query(
            `INSERT INTO TRANSACTION (Amount, Transaction_Type, Description, PayMethod, CustID, Account_No)
             VALUES (?, 'CREDIT', ?, ?, ?, ?)`,
            [Amount, `Transfer from A/c ${senderAccount.Account_No}`, PayMethod || 'NEFT', actualReceiverCustID, ReceiverAccountNo]
        );

        // 6. Update Receiver Balance
        await connection.query(
            `UPDATE ACCOUNT SET Balance = Balance + ? WHERE Account_No = ?`,
            [Amount, ReceiverAccountNo]
        );

        await connection.commit();
        res.json({ message: 'Transfer completed successfully' });
    } catch (err) {
        if (connection) await connection.rollback();
        res.status(400).json({ error: err.message });
    } finally {
        if (connection) connection.release();
    }
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