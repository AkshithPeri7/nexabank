const { db } = require('../config/db');

exports.getAll = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM PAYMENT');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getByTransaction = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM PAYMENT WHERE Txn_ID = ?', [req.params.txnId]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.create = async (req, res) => {
  const { Txn_ID, Amount, PaymentDate, Mode } = req.body;
  try {
    const [result] = await db.query(
      `INSERT INTO PAYMENT (Txn_ID, Amount, PaymentDate, Mode) VALUES (?,?,?,?)`,
      [Txn_ID, Amount, PaymentDate, Mode]
    );
    res.status(201).json({ PaymentID: result.insertId, message: 'Payment recorded' });
  } catch (err) { res.status(500).json({ error: err.message }); }
};