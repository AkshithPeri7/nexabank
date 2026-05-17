const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function forceSeed() {
    const connectionString = "mysql://root:gCSbdPmnbULhucbQmieIvJSBHHKcBkZE@trolley.proxy.rlwy.net:53320/railway";

    console.log("🚀 Connecting to Railway Database...");
    const connection = await mysql.createConnection(connectionString);

    try {
        // ── Step 1: Ensure Email column exists ────────────────────────
        console.log("🔧 Ensuring Email column exists on BANK_EMPLOYEE...");
        try {
            await connection.query(`ALTER TABLE BANK_EMPLOYEE ADD COLUMN Email VARCHAR(150) AFTER LName`);
            console.log("  ✅ Email column added.");
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log("  ℹ️  Email column already exists.");
            } else {
                throw e;
            }
        }

        // Ensure all other columns exist too
        const extraCols = [
            `ALTER TABLE BANK_EMPLOYEE ADD COLUMN IF NOT EXISTS Salary DECIMAL(10,2)`,
            `ALTER TABLE BANK_EMPLOYEE ADD COLUMN IF NOT EXISTS D_und VARCHAR(100)`,
            `ALTER TABLE BANK_EMPLOYEE ADD COLUMN IF NOT EXISTS JoinedDate DATE`,
            `ALTER TABLE BANK_EMPLOYEE ADD COLUMN IF NOT EXISTS BranchID INT`,
            `ALTER TABLE BANK_EMPLOYEE ADD COLUMN IF NOT EXISTS City VARCHAR(100)`,
            `ALTER TABLE BANK_EMPLOYEE ADD COLUMN IF NOT EXISTS Country VARCHAR(100)`,
            `ALTER TABLE BANK_EMPLOYEE ADD COLUMN IF NOT EXISTS ContactNo VARCHAR(15)`,
            `ALTER TABLE BANK_EMPLOYEE ADD COLUMN IF NOT EXISTS Address TEXT`,
        ];
        for (const q of extraCols) {
            try { await connection.query(q); } catch(e) { /* ignore */ }
        }

        // ── Step 2: Full employee roster with rich details ─────────────
        const hash = await bcrypt.hash('admin123', 10);

        const employees = [
            {
                Name: 'Akshith', LName: 'Peri',
                Email: 'akshith.peri@nexabank.in',
                Salary: 95000.00, D_und: 'Technology',
                JoinedDate: '2022-06-01',
                Responsibility: 'System Administrator & Tech Lead',
                BranchID: 1, City: 'Hyderabad', Country: 'India',
                Address: '12, Jubilee Hills, Hyderabad, Telangana',
                ContactNo: '+91-9876500001'
            },
            {
                Name: 'Rahul', LName: 'Sharma',
                Email: 'rahul.sharma@nexabank.in',
                Salary: 72000.00, D_und: 'Loans & Credit',
                JoinedDate: '2020-03-15',
                Responsibility: 'Senior Loan Officer',
                BranchID: 1, City: 'Hyderabad', Country: 'India',
                Address: '45, Banjara Hills, Hyderabad, Telangana',
                ContactNo: '+91-9876500002'
            },
            {
                Name: 'Priya', LName: 'Nair',
                Email: 'priya.nair@nexabank.in',
                Salary: 65000.00, D_und: 'Customer Relations',
                JoinedDate: '2021-08-01',
                Responsibility: 'Customer Support Manager',
                BranchID: 2, City: 'Bangalore', Country: 'India',
                Address: '78, Koramangala, Bangalore, Karnataka',
                ContactNo: '+91-9876500003'
            },
            {
                Name: 'Vikram', LName: 'Mehta',
                Email: 'vikram.mehta@nexabank.in',
                Salary: 110000.00, D_und: 'Management',
                JoinedDate: '2018-01-10',
                Responsibility: 'Branch Manager',
                BranchID: 1, City: 'Hyderabad', Country: 'India',
                Address: '3, Film Nagar, Hyderabad, Telangana',
                ContactNo: '+91-9876500004'
            },
            {
                Name: 'Sneha', LName: 'Reddy',
                Email: 'sneha.reddy@nexabank.in',
                Salary: 58000.00, D_und: 'Compliance & KYC',
                JoinedDate: '2023-01-20',
                Responsibility: 'KYC Verification Officer',
                BranchID: 2, City: 'Bangalore', Country: 'India',
                Address: '22, Indiranagar, Bangalore, Karnataka',
                ContactNo: '+91-9876500005'
            },
            {
                Name: 'Arjun', LName: 'Kumar',
                Email: 'arjun.kumar@nexabank.in',
                Salary: 68000.00, D_und: 'Finance & Accounts',
                JoinedDate: '2019-07-05',
                Responsibility: 'Finance Analyst',
                BranchID: 3, City: 'Mumbai', Country: 'India',
                Address: '9, Andheri West, Mumbai, Maharashtra',
                ContactNo: '+91-9876500006'
            },
            {
                Name: 'Meena', LName: 'Iyer',
                Email: 'meena.iyer@nexabank.in',
                Salary: 55000.00, D_und: 'Operations',
                JoinedDate: '2022-11-01',
                Responsibility: 'Operations Executive',
                BranchID: 3, City: 'Mumbai', Country: 'India',
                Address: '14, Powai, Mumbai, Maharashtra',
                ContactNo: '+91-9876500007'
            },
            {
                Name: 'Deepak', LName: 'Gupta',
                Email: 'deepak.gupta@nexabank.in',
                Salary: 80000.00, D_und: 'Risk Management',
                JoinedDate: '2020-09-12',
                Responsibility: 'Risk & Audit Manager',
                BranchID: 1, City: 'Hyderabad', Country: 'India',
                Address: '66, Madhapur, Hyderabad, Telangana',
                ContactNo: '+91-9876500008'
            }
        ];

        console.log("👥 Upserting employee records...");

        for (const emp of employees) {
            // Check if email already exists
            const [existing] = await connection.query(
                `SELECT EID FROM BANK_EMPLOYEE WHERE Email = ?`, [emp.Email]
            );

            if (existing.length > 0) {
                // Update existing
                await connection.query(`
                    UPDATE BANK_EMPLOYEE SET
                        Name=?, LName=?, Salary=?, D_und=?, JoinedDate=?,
                        Responsibility=?, BranchID=?, City=?, Country=?,
                        Address=?, ContactNo=?, PasswordHash=?
                    WHERE Email=?`,
                    [emp.Name, emp.LName, emp.Salary, emp.D_und, emp.JoinedDate,
                     emp.Responsibility, emp.BranchID, emp.City, emp.Country,
                     emp.Address, emp.ContactNo, hash, emp.Email]
                );
                console.log(`  ↻ Updated: ${emp.Name} ${emp.LName} (${emp.Email})`);
            } else {
                // Insert new
                await connection.query(`
                    INSERT INTO BANK_EMPLOYEE
                        (Name, LName, Email, Salary, D_und, JoinedDate,
                         Responsibility, BranchID, City, Country, Address, ContactNo, PasswordHash)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [emp.Name, emp.LName, emp.Email, emp.Salary, emp.D_und, emp.JoinedDate,
                     emp.Responsibility, emp.BranchID, emp.City, emp.Country,
                     emp.Address, emp.ContactNo, hash]
                );
                console.log(`  ✅ Inserted: ${emp.Name} ${emp.LName} (${emp.Email})`);
            }
        }

        // ── Step 3: Verify ─────────────────────────────────────────────
        const [final] = await connection.query(
            `SELECT EID, Name, LName, Email, Responsibility, City FROM BANK_EMPLOYEE ORDER BY EID`
        );
        console.log("\n📋 Current Employee Roster:");
        console.table(final);

    } catch (err) {
        console.error("❌ Error:", err.message);
    } finally {
        await connection.end();
        console.log("\n👋 Done.");
    }
}

forceSeed();
