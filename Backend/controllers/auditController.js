const { db } = require('../config/db');

exports.getAll = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM AUDIT_LOG_ENTRY ORDER BY LogTimestamp DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getByTransaction = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM AUDIT_LOG_ENTRY WHERE TxnID = ?', [req.params.txnId]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.create = async (req, res) => {
  const { TxnID, DetailID, LogType, LogDetails, Event, Reference, Officer } = req.body;
  try {
    const [result] = await db.query(
      `INSERT INTO AUDIT_LOG_ENTRY (TxnID, DetailID, LogType, LogDetails, Event, Reference, Officer) VALUES (?,?,?,?,?,?,?)`,
      [TxnID, DetailID, LogType, LogDetails, Event, Reference, Officer]
    );
    res.status(201).json({ LogID: result.insertId, message: 'Audit log created' });
  } catch (err) { res.status(500).json({ error: err.message }); }
};