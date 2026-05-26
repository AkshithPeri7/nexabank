const { db } = require('../config/db');

async function run() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS RECURRING_DEPOSIT (
                RD_ID INT PRIMARY KEY AUTO_INCREMENT,
                Cust_ID INT,
                MonthlyInstallment DECIMAL(15,2),
                InterestRate DECIMAL(5,2),
                TenureMonths INT,
                StartDate DATE,
                MaturityDate DATE,
                MaturityAmount DECIMAL(15,2),
                Status ENUM('ACTIVE', 'MATURED', 'CLOSED') DEFAULT 'ACTIVE',
                FOREIGN KEY (Cust_ID) REFERENCES BANK_CUSTOMER(Cust_ID) ON DELETE CASCADE
            )
        `);
        console.log("RECURRING_DEPOSIT table created.");
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
run();
