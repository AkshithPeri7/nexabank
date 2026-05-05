const mysql = require('mysql2/promise');

async function forceSeed() {
    // YOUR RAILWAY URL
    const connectionString = "mysql://root:gCSbdPmnbULhucbQmieIvJSBHHKcBkZE@trolley.proxy.rlwy.net:53320/railway";
    
    console.log("🚀 Connecting to Railway Database...");
    const connection = await mysql.createConnection(connectionString);

    try {
        console.log("📁 Creating tables...");
        // Add all your table creation logic here or run the schema
        // For now, let's ensure the employees are there
        await connection.query(`
            CREATE TABLE IF NOT EXISTS BANK_EMPLOYEE (
                EID INT PRIMARY KEY AUTO_INCREMENT,
                Name VARCHAR(100),
                LName VARCHAR(100),
                Responsibility VARCHAR(255),
                PasswordHash VARCHAR(255)
            )
        `);

        const [rows] = await connection.query("SELECT COUNT(*) as count FROM BANK_EMPLOYEE");
        if (rows[0].count === 0) {
            console.log("👤 Seeding Employees...");
            const bcrypt = require('bcryptjs');
            const hash = await bcrypt.hash('admin123', 10);
            
            const employees = [
                ['Akshith', 'Peri', 'System Administrator', hash],
                ['John', 'Doe', 'Loan Officer', hash],
                ['Jane', 'Smith', 'Customer Support', hash],
                ['Michael', 'Scott', 'Branch Manager', hash]
            ];

            for (const emp of employees) {
                await connection.query(
                    "INSERT INTO BANK_EMPLOYEE (Name, LName, Responsibility, PasswordHash) VALUES (?, ?, ?, ?)",
                    emp
                );
            }
            console.log("✅ Employees inserted successfully!");
        } else {
            console.log("ℹ️ Employees already exist in the table.");
        }

    } catch (err) {
        console.error("❌ Error:", err.message);
    } finally {
        await connection.end();
        console.log("👋 Done.");
    }
}

forceSeed();
