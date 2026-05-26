const mysql = require('mysql2/promise');
async function run() {
    const conn = await mysql.createConnection('mysql://root:gCSbdPmnbULhucbQmieIvJSBHHKcBkZE@trolley.proxy.rlwy.net:53320/railway');
    
    await conn.query(`
    CREATE TABLE IF NOT EXISTS BENEFICIARY (
      Ben_ID INT PRIMARY KEY AUTO_INCREMENT,
      Cust_ID INT,
      Ben_Name VARCHAR(100),
      Ben_Account_No INT,
      FOREIGN KEY (Cust_ID) REFERENCES BANK_CUSTOMER(Cust_ID) ON DELETE CASCADE
    )`);
    console.log('Created BENEFICIARY table');

    await conn.query(`
    CREATE TABLE IF NOT EXISTS FIXED_DEPOSIT (
      FD_ID INT PRIMARY KEY AUTO_INCREMENT,
      Cust_ID INT,
      Principal DECIMAL(15,2),
      InterestRate DECIMAL(5,2),
      TenureMonths INT,
      StartDate DATE,
      MaturityDate DATE,
      MaturityAmount DECIMAL(15,2),
      Status ENUM('ACTIVE', 'MATURED', 'CLOSED') DEFAULT 'ACTIVE',
      FOREIGN KEY (Cust_ID) REFERENCES BANK_CUSTOMER(Cust_ID) ON DELETE CASCADE
    )`);
    console.log('Created FIXED_DEPOSIT table');

    await conn.query(`
    CREATE TABLE IF NOT EXISTS LOAN_EMI_SCHEDULE (
      EMI_ID INT PRIMARY KEY AUTO_INCREMENT,
      LoanID INT,
      DueDate DATE,
      EMIAmount DECIMAL(15,2),
      PrincipalComponent DECIMAL(15,2),
      InterestComponent DECIMAL(15,2),
      Status ENUM('PENDING', 'PAID', 'OVERDUE') DEFAULT 'PENDING',
      FOREIGN KEY (LoanID) REFERENCES LOAN_REQUEST(LoanID) ON DELETE CASCADE
    )`);
    console.log('Created LOAN_EMI_SCHEDULE table');
    
    await conn.end();
}
run().catch(e => console.error('DB Error:', e.message));
