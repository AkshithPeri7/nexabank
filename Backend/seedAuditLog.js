const { db } = require('./config/db');

async function seedAuditLog() {
    try {
        await db.query('DELETE FROM AUDIT_LOG_ENTRY');
        await db.query(`INSERT INTO AUDIT_LOG_ENTRY (Event, Reference, LogDetails, Officer) VALUES 
            ('LOGIN', '—', 'Admin logged in', 'EMP1001'),
            ('ADMIN', 'LN0003', 'Loan LN0003 REJECTED - Low CIBIL', 'EMP1001'),
            ('ADMIN', 'LN0002', 'Loan LN0002 APPROVED', 'EMP1001'),
            ('KYC', 'KYC001', 'KYC review started for User', 'EMP1004')
        `);
        console.log("Audit log seeded");
    } catch (e) { console.log(e.message); }
    process.exit();
}
seedAuditLog();
