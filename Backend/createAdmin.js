const { db } = require('./config/db');
const bcrypt = require('bcryptjs');

async function createAdmin() {
    try {
        const passwordHash = await bcrypt.hash('admin123', 10);
        await db.query(
            `INSERT INTO BANK_EMPLOYEE (Name, LName, Responsibility, PasswordHash) VALUES (?, ?, ?, ?)`,
            ['admin', 'superuser', 'System Administrator', passwordHash]
        );
        console.log('Admin account created successfully: User: admin, Pass: admin123');
        process.exit(0);
    } catch (err) {
        console.error('Error creating admin:', err);
        process.exit(1);
    }
}

createAdmin();
