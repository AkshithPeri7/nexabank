const { db } = require('../config/db');

exports.getAll = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT a.*, c.FName, c.LName FROM ACCOUNT a
      JOIN BANK_CUSTOMER c ON a.CustID = c.Cust_ID
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getById = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM ACCOUNT WHERE Account_No = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Account not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.create = async (req, res) => {
  const { CustID, BranchID, DailyPrice, AccountType, Balance } = req.body;
  try {
    const [result] = await db.query(
      `INSERT INTO ACCOUNT (CustID, BranchID, DailyPrice, AccountType, Balance) VALUES (?,?,?,?,?)`,
      [CustID, BranchID, DailyPrice, AccountType, Balance]
    );
    res.status(201).json({ Account_No: result.insertId, message: 'Account created' });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateBalance = async (req, res) => {
  const { Balance } = req.body;
  try {
    await db.query('UPDATE ACCOUNT SET Balance = ? WHERE Account_No = ?', [Balance, req.params.id]);
    res.json({ message: 'Balance updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getHolders = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM ACCOUNT_HOLDER WHERE Account_No = ?', [req.params.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.addHolder = async (req, res) => {
  const { HolderName, HolderType, DOB, Cust_ID, ContactNo, Email, Address, Relationship, IDProofType } = req.body;
  try {
    // If Cust_ID provided, auto-fill from BANK_CUSTOMER
    let holderName = HolderName;
    let holderDOB  = DOB;
    let contact    = ContactNo;
    let email      = Email;
    let address    = Address;
    let idProof    = IDProofType || 'AADHAAR';
    if (Cust_ID) {
      const [crows] = await db.query('SELECT * FROM BANK_CUSTOMER WHERE Cust_ID = ?', [Cust_ID]);
      if (crows.length) {
        const c = crows[0];
        holderName = holderName || `${c.FName} ${c.LName || ''}`.trim();
        holderDOB  = holderDOB  || c.CustDOB;
        contact    = contact    || c.ContactNo;
        email      = email      || c.Email;
        address    = address    || c.Address;
        idProof    = idProof    || c.CustIDProofType;
      }
    }
    await db.query(
      `INSERT INTO ACCOUNT_HOLDER (Account_No, Cust_ID, HolderName, HolderType, DOB, ContactNo, Email, Address, Relationship, IDProofType)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [req.params.id, Cust_ID || null, holderName, HolderType || 'PRIMARY', holderDOB || null,
       contact || null, email || null, address || null, Relationship || 'SELF', idProof]
    );
    res.status(201).json({ message: 'Account holder added' });
  } catch (err) { res.status(500).json({ error: err.message }); }
};