const db = require('../config/db');

exports.getBeneficiaries = async (req, res) => {
    try {
        const { custId } = req.params;
        const [rows] = await db.query('SELECT * FROM BENEFICIARY WHERE Cust_ID = ?', [custId]);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error fetching beneficiaries' });
    }
};

exports.addBeneficiary = async (req, res) => {
    try {
        const { custId } = req.params;
        const { Ben_Name, Ben_Account_No } = req.body;
        
        // Check if account exists
        const [accs] = await db.query('SELECT * FROM ACCOUNT WHERE Account_No = ?', [Ben_Account_No]);
        if (accs.length === 0) {
            return res.status(404).json({ error: 'Target account number does not exist in NexaBank.' });
        }

        const [result] = await db.query(
            'INSERT INTO BENEFICIARY (Cust_ID, Ben_Name, Ben_Account_No) VALUES (?, ?, ?)',
            [custId, Ben_Name, Ben_Account_No]
        );
        res.status(201).json({ message: 'Beneficiary added successfully', Ben_ID: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error adding beneficiary' });
    }
};

exports.deleteBeneficiary = async (req, res) => {
    try {
        const { benId } = req.params;
        await db.query('DELETE FROM BENEFICIARY WHERE Ben_ID = ?', [benId]);
        res.json({ message: 'Beneficiary deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error deleting beneficiary' });
    }
};
