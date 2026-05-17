const mysql = require('mysql2/promise');
async function patch() {
    const conn = await mysql.createConnection('mysql://root:gCSbdPmnbULhucbQmieIvJSBHHKcBkZE@trolley.proxy.rlwy.net:53320/railway');
    await conn.query(`UPDATE BANK_EMPLOYEE SET Email='admin@nexabank.in', D_und='Management', City='Hyderabad', Country='India', ContactNo='+91-9876500000' WHERE EID=1`);
    await conn.query(`UPDATE BANK_EMPLOYEE SET Email='superadmin@nexabank.in', D_und='Technology', City='Hyderabad', Country='India', ContactNo='+91-9876500099' WHERE EID=2`);
    const [rows] = await conn.query(`SELECT EID, Name, LName, Email, D_und, City FROM BANK_EMPLOYEE ORDER BY EID`);
    console.table(rows);
    await conn.end();
    console.log('Done!');
}
patch();
