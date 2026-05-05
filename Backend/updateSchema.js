const { db } = require('./config/db');

async function updateSchema() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS CREDIT_CARD_REQUEST (
              CardID INT PRIMARY KEY AUTO_INCREMENT,
              Cust_ID INT,
              CardType VARCHAR(50),
              Income DECIMAL(15,2),
              ApprovalStatus ENUM('PENDING','APPROVED','REJECTED') DEFAULT 'PENDING',
              CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (Cust_ID) REFERENCES BANK_CUSTOMER(Cust_ID) ON DELETE CASCADE
            )
        `);
        await db.query(`
            CREATE TABLE IF NOT EXISTS INVESTMENT (
              InvestID INT PRIMARY KEY AUTO_INCREMENT,
              Cust_ID INT,
              InvestType VARCHAR(50),
              Amount DECIMAL(15,2),
              DurationMonths INT,
              Status ENUM('ACTIVE','CLOSED') DEFAULT 'ACTIVE',
              CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (Cust_ID) REFERENCES BANK_CUSTOMER(Cust_ID) ON DELETE CASCADE
            )
        `);
        console.log('Tables added.');
        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
}
updateSchema();
