const { db } = require('./config/db');

async function updateAuditLog() {
    try {
        await db.query('ALTER TABLE AUDIT_LOG_ENTRY ADD COLUMN Reference VARCHAR(50)');
    } catch (e) { console.log(e.message); }
    try {
        await db.query('ALTER TABLE AUDIT_LOG_ENTRY ADD COLUMN Officer VARCHAR(50)');
    } catch (e) { console.log(e.message); }
    try {
        await db.query('ALTER TABLE AUDIT_LOG_ENTRY ADD COLUMN Event VARCHAR(50)');
    } catch (e) { console.log(e.message); }
    console.log("Audit log schema updated");
    process.exit();
}
updateAuditLog();
