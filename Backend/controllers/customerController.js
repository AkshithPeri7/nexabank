const { db } = require('../config/db');

exports.getAll = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM BANK_CUSTOMER');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getById = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM BANK_CUSTOMER WHERE Cust_ID = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Customer not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.create = async (req, res) => {
  const { FName, LName, Name, TaxID, ContactNo, HouseNo, Address, DrivingLicence, CustDOB, CustIDProofType, CustomerType } = req.body;
  try {
    const [result] = await db.query(
      `INSERT INTO BANK_CUSTOMER (FName,LName,Name,TaxID,ContactNo,HouseNo,Address,DrivingLicence,CustDOB,CustIDProofType,CustomerType)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [FName, LName, Name, TaxID, ContactNo, HouseNo, Address, DrivingLicence, CustDOB, CustIDProofType, CustomerType]
    );
    res.status(201).json({ Cust_ID: result.insertId, message: 'Customer created' });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.update = async (req, res) => {
  const { FName, LName, ContactNo, Address, CustomerType } = req.body;
  try {
    await db.query(
      `UPDATE BANK_CUSTOMER SET FName=?, LName=?, ContactNo=?, Address=?, CustomerType=? WHERE Cust_ID=?`,
      [FName, LName, ContactNo, Address, CustomerType, req.params.id]
    );
    res.json({ message: 'Customer updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.remove = async (req, res) => {
  try {
    await db.query('DELETE FROM BANK_CUSTOMER WHERE Cust_ID = ?', [req.params.id]);
    res.json({ message: 'Customer deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ─── GOOGLE ONBOARDING: Update contact + initial deposit ─────────
exports.updateContact = async (req, res) => {
  const { contactNo, initialDeposit } = req.body;
  const custId = req.params.id;
  try {
    // Update phone number
    if (contactNo) {
      await db.query('UPDATE BANK_CUSTOMER SET ContactNo = ? WHERE Cust_ID = ?', [contactNo, custId]);
    }
    // Update the balance of the most recent savings account
    if (initialDeposit && parseFloat(initialDeposit) >= 500) {
      await db.query(
        `UPDATE ACCOUNT SET Balance = ? WHERE CustID = ? AND AccountType = 'SAVINGS' ORDER BY CreatedAt DESC LIMIT 1`,
        [parseFloat(initialDeposit), custId]
      );
    }
    res.json({ message: 'Contact and deposit updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};