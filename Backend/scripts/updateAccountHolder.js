require('dotenv').config();
const { db } = require('../config/db');

const queries = [
    `ALTER TABLE ACCOUNT_HOLDER ADD COLUMN Cust_ID INT NULL`,
    `ALTER TABLE ACCOUNT_HOLDER ADD COLUMN ContactNo VARCHAR(15)`,
    `ALTER TABLE ACCOUNT_HOLDER ADD COLUMN Email VARCHAR(150)`,
    `ALTER TABLE ACCOUNT_HOLDER ADD COLUMN Address TEXT`,
    `ALTER TABLE ACCOUNT_HOLDER ADD COLUMN Relationship VARCHAR(50) DEFAULT 'SELF'`,
    `ALTER TABLE ACCOUNT_HOLDER ADD COLUMN IDProofType VARCHAR(50) DEFAULT 'AADHAAR'`,
    `ALTER TABLE ACCOUNT_HOLDER ADD CONSTRAINT fk_holder_cust FOREIGN KEY (Cust_ID) REFERENCES BANK_CUSTOMER(Cust_ID) ON DELETE SET NULL`,

    // Backfill existing rows: pull Name and DOB from BANK_CUSTOMER via ACCOUNT
    `UPDATE ACCOUNT_HOLDER ah
        JOIN ACCOUNT a ON ah.Account_No = a.Account_No
        JOIN BANK_CUSTOMER c ON a.CustID = c.Cust_ID
     SET
        ah.Cust_ID = c.Cust_ID,
        ah.HolderName = CONCAT(c.FName, ' ', IFNULL(c.LName, '')),
        ah.DOB = c.CustDOB,
        ah.ContactNo = c.ContactNo,
        ah.Email = c.Email,
        ah.Address = c.Address,
        ah.IDProofType = c.CustIDProofType
     WHERE ah.Cust_ID IS NULL`
];

(async () => {
    for (const q of queries) {
        try {
            await db.query(q);
            console.log('✅ OK:', q.substring(0, 70));
        } catch (e) {
            const skip = ['ER_DUP_FIELDNAME', 'ER_DUP_KEY', 'ER_FK_DUP_NAME', 'ER_DUP_KEYNAME'];
            if (skip.includes(e.code)) {
                console.log('⏭️  SKIP (already exists):', q.substring(0, 70));
            } else {
                console.error('❌ ERR:', e.message);
            }
        }
    }
    console.log('\nDone! ACCOUNT_HOLDER table updated.');
    process.exit();
})();
