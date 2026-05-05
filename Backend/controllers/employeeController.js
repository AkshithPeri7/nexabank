const { db } = require('../config/db');

exports.getAll = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM BANK_EMPLOYEE');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getById = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM BANK_EMPLOYEE WHERE EID = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Employee not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.create = async (req, res) => {
  const { Name, LName, Salary, D_und, JoinedDate, Responsibility, BranchID, HouseNo, City, Country, Address, ContactNo } = req.body;
  try {
    const [result] = await db.query(
      `INSERT INTO BANK_EMPLOYEE (Name,LName,Salary,D_und,JoinedDate,Responsibility,BranchID,HouseNo,City,Country,Address,ContactNo)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [Name, LName, Salary, D_und, JoinedDate, Responsibility, BranchID, HouseNo, City, Country, Address, ContactNo]
    );
    res.status(201).json({ EID: result.insertId, message: 'Employee created' });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.update = async (req, res) => {
  const { Name, LName, Salary, Responsibility, ContactNo } = req.body;
  try {
    await db.query(
      `UPDATE BANK_EMPLOYEE SET Name=?, LName=?, Salary=?, Responsibility=?, ContactNo=? WHERE EID=?`,
      [Name, LName, Salary, Responsibility, ContactNo, req.params.id]
    );
    res.json({ message: 'Employee updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.remove = async (req, res) => {
  try {
    await db.query('DELETE FROM BANK_EMPLOYEE WHERE EID = ?', [req.params.id]);
    res.json({ message: 'Employee deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
};