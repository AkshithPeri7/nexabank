const { db } = require('../config/db');

exports.getAll = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM LOAN_REQUEST');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getById = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM LOAN_REQUEST WHERE LoanID = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Loan not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.create = async (req, res) => {
  const { Cust_ID, Requested_Amount, LoanRate, TenureMonths, PickupDate, PickupLocation, AppcelationDetails } = req.body;
  try {
    const [result] = await db.query(
      `INSERT INTO LOAN_REQUEST (Cust_ID, Requested_Amount, LoanRate, TenureMonths, PickupDate, PickupLocation, AppcelationDetails)
       VALUES (?,?,?,?,?,?,?)`,
      [Cust_ID, Requested_Amount, LoanRate, TenureMonths, PickupDate, PickupLocation, AppcelationDetails]
    );
    res.status(201).json({ LoanID: result.insertId, message: 'Loan request submitted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateStatus = async (req, res) => {
  const { ApprovalStatus } = req.body;
  try {
    await db.query('UPDATE LOAN_REQUEST SET ApprovalStatus = ? WHERE LoanID = ?', [ApprovalStatus, req.params.id]);
    res.json({ message: 'Loan status updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getTermDetails = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM LOAN_TERM_DETAIL WHERE LoanID = ?', [req.params.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.addTermDetail = async (req, res) => {
  const { noOfDays, NewTerms, CancellationReason } = req.body;
  try {
    await db.query(
      `INSERT INTO LOAN_TERM_DETAIL (LoanID, noOfDays, NewTerms, CancellationReason) VALUES (?,?,?,?)`,
      [req.params.id, noOfDays, NewTerms, CancellationReason]
    );
    res.status(201).json({ message: 'Term detail added' });
  } catch (err) { res.status(500).json({ error: err.message }); }
};