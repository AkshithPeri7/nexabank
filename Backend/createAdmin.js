const { db } = require('./config/db');
const bcrypt = require('bcryptjs');

async function createAdmin() {
    try {
        const passwordHash = await bcrypt.hash('admin123', 10);
        const employees = [
            ['Akshith', 'Peri', 'System Administrator', passwordHash],
            ['John', 'Doe', 'Loan Officer', passwordHash],
            ['Jane', 'Smith', 'Customer Support', passwordHash],
            ['Michael', 'Scott', 'Branch Manager', passwordHash]
        ];
        
        for (const emp of employees) {
            await db.query(
                `INSERT INTO BANK_EMPLOYEE (Name, LName, Responsibility, PasswordHash) VALUES (?, ?, ?, ?)`,
                emp
            );
            console.log(`Employee created: ${emp[0]} ${emp[1]} - ${emp[2]}`);
        }
        console.log('All employee accounts created successfully! Password for all is: admin123');
        process.exit(0);
    } catch (err) {
        console.error('Error creating employees:', err);
        process.exit(1);
    }
}

createAdmin();
