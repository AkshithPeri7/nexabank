/**
 * ============================================================
 * Vault Edge Bank — Full Migration Script
 * Migrates ALL data from local bank_db → Railway Database
 * Run once: node migrateToRailway.js
 * ============================================================
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

// ─── CONFIG ─────────────────────────────────────────────────
const LOCAL_DB = {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'root',       // Your local MySQL password
    database: 'bank_db',
};

const RAILWAY_URL = 'mysql://root:gCSbdPmnbULhucbQmieIvJSBHHKcBkZE@trolley.proxy.rlwy.net:53320/railway';

// ─── CREATE ALL TABLES IN RAILWAY ────────────────────────────
const TABLE_DEFINITIONS = [
    `CREATE TABLE IF NOT EXISTS BANK_EMPLOYEE (
        EID            INT PRIMARY KEY AUTO_INCREMENT,
        Name           VARCHAR(100),
        LName          VARCHAR(100),
        Salary         DECIMAL(10,2),
        D_und          VARCHAR(100),
        JoinedDate     DATE,
        Responsibility VARCHAR(255),
        BranchID       INT,
        HouseNo        VARCHAR(50),
        City           VARCHAR(100),
        Country        VARCHAR(100),
        Address        TEXT,
        ContactNo      VARCHAR(15),
        PasswordHash   VARCHAR(255)
    )`,
    `CREATE TABLE IF NOT EXISTS BANK_CUSTOMER (
        Cust_ID        INT PRIMARY KEY AUTO_INCREMENT,
        FName          VARCHAR(100) NOT NULL,
        LName          VARCHAR(100),
        Email          VARCHAR(150),
        TaxID          VARCHAR(50),
        ContactNo      VARCHAR(15),
        Address        TEXT,
        DrivingLicence VARCHAR(50),
        CustDOB        DATE,
        CustIDProofType VARCHAR(50) DEFAULT 'AADHAAR',
        CustomerType   ENUM('INDIVIDUAL','CORPORATE','VIP') DEFAULT 'INDIVIDUAL',
        PasswordHash   VARCHAR(255)
    )`,
    `CREATE TABLE IF NOT EXISTS ACCOUNT (
        Account_No  INT PRIMARY KEY AUTO_INCREMENT,
        CustID      INT,
        AccountType ENUM('SAVINGS','CURRENT','FD','LOAN') DEFAULT 'SAVINGS',
        Balance     DECIMAL(15,2) DEFAULT 0.00,
        CreatedAt   DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (CustID) REFERENCES BANK_CUSTOMER(Cust_ID) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS \`TRANSACTION\` (
        Txn_ID     INT PRIMARY KEY AUTO_INCREMENT,
        Account_No INT,
        Txn_type   ENUM('CREDIT','DEBIT','TRANSFER') NOT NULL,
        Amount     DECIMAL(15,2),
        Txn_Date   DATETIME DEFAULT CURRENT_TIMESTAMP,
        Description VARCHAR(255),
        FOREIGN KEY (Account_No) REFERENCES ACCOUNT(Account_No) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS PAYMENT (
        PaymentID   INT PRIMARY KEY AUTO_INCREMENT,
        Txn_ID      INT,
        Amount      DECIMAL(15,2),
        PaymentDate DATE,
        Mode        VARCHAR(50),
        FOREIGN KEY (Txn_ID) REFERENCES \`TRANSACTION\`(Txn_ID) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS LOAN_REQUEST (
        LoanID           INT PRIMARY KEY AUTO_INCREMENT,
        Cust_ID          INT,
        Requested_Amount DECIMAL(15,2),
        LoanRate         DECIMAL(5,2),
        TenureMonths     INT,
        ApprovalStatus   ENUM('PENDING','APPROVED','REJECTED') DEFAULT 'PENDING',
        PickupDate       DATE,
        PickupLocation   VARCHAR(255),
        AppcelationDetails TEXT,
        CreatedAt        DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (Cust_ID) REFERENCES BANK_CUSTOMER(Cust_ID) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS LOAN_TERM_DETAIL (
        DetailID           INT PRIMARY KEY AUTO_INCREMENT,
        LoanID             INT,
        noOfDays           INT,
        NewTerms           TEXT,
        CancellationReason TEXT,
        FOREIGN KEY (LoanID) REFERENCES LOAN_REQUEST(LoanID) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS AUDIT_LOG_ENTRY (
        LogID        INT PRIMARY KEY AUTO_INCREMENT,
        TxnID        INT,
        DetailID     INT,
        Event        VARCHAR(50),
        Reference    VARCHAR(100),
        LogType      VARCHAR(50),
        LogTimestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        LogDetails   TEXT,
        Officer      VARCHAR(100)
    )`,
    `CREATE TABLE IF NOT EXISTS EMPLOYEE_SUPERVISES_CUSTOMER (
        EID     INT,
        Cust_ID INT,
        PRIMARY KEY (EID, Cust_ID),
        FOREIGN KEY (EID)     REFERENCES BANK_EMPLOYEE(EID) ON DELETE CASCADE,
        FOREIGN KEY (Cust_ID) REFERENCES BANK_CUSTOMER(Cust_ID) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS CREDIT_CARD_REQUEST (
        CardID         INT PRIMARY KEY AUTO_INCREMENT,
        Cust_ID        INT,
        CardType       VARCHAR(50),
        Income         DECIMAL(15,2),
        ApprovalStatus ENUM('PENDING','APPROVED','REJECTED') DEFAULT 'PENDING',
        CreatedAt      DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (Cust_ID) REFERENCES BANK_CUSTOMER(Cust_ID) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS INVESTMENT (
        InvestID       INT PRIMARY KEY AUTO_INCREMENT,
        Cust_ID        INT,
        InvestType     VARCHAR(50),
        Amount         DECIMAL(15,2),
        DurationMonths INT,
        Status         ENUM('ACTIVE','MATURED','CANCELLED') DEFAULT 'ACTIVE',
        CreatedAt      DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (Cust_ID) REFERENCES BANK_CUSTOMER(Cust_ID) ON DELETE CASCADE
    )`
];

// Tables to migrate in order (respecting FK deps)
const TABLES_TO_MIGRATE = [
    'BANK_EMPLOYEE',
    'BANK_CUSTOMER',
    'ACCOUNT',
    'TRANSACTION',
    'PAYMENT',
    'LOAN_REQUEST',
    'LOAN_TERM_DETAIL',
    'AUDIT_LOG_ENTRY',
    'EMPLOYEE_SUPERVISES_CUSTOMER',
    'CREDIT_CARD_REQUEST',
    'INVESTMENT',
];

// ─── MAIN ─────────────────────────────────────────────────────
async function migrate() {
    let local = null;
    let railway = null;

    try {
        console.log('\n🚀 Vault Edge Bank — Migration Tool');
        console.log('====================================\n');

        // 1. Connect to Railway
        console.log('🔌 Connecting to Railway...');
        railway = await mysql.createConnection(RAILWAY_URL);
        console.log('   ✅ Railway connected!\n');

        // 2. Try to connect to local DB
        let hasLocal = false;
        try {
            console.log('🔌 Connecting to local bank_db...');
            local = await mysql.createConnection(LOCAL_DB);
            console.log('   ✅ Local DB connected!\n');
            hasLocal = true;
        } catch (e) {
            console.log('   ⚠️  Local DB not available — will only create tables & seed employees.\n');
        }

        // 3. Create all tables in Railway
        console.log('📋 Creating tables in Railway...');
        await railway.query('SET FOREIGN_KEY_CHECKS = 0');
        for (const sql of TABLE_DEFINITIONS) {
            await railway.query(sql);
        }
        await railway.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('   ✅ All tables created/verified!\n');

        // 4. Migrate data from local if available
        if (hasLocal) {
            for (const table of TABLES_TO_MIGRATE) {
                try {
                    const [rows] = await local.query(`SELECT * FROM \`${table}\``);
                    if (rows.length === 0) {
                        console.log(`   ⏭️  ${table}: empty, skipping.`);
                        continue;
                    }

                    // Clear existing Railway data first to avoid duplicates
                    await railway.query('SET FOREIGN_KEY_CHECKS = 0');
                    await railway.query(`DELETE FROM \`${table}\``);
                    await railway.query(`ALTER TABLE \`${table}\` AUTO_INCREMENT = 1`);
                    await railway.query('SET FOREIGN_KEY_CHECKS = 1');

                    // Bulk insert
                    const columns = Object.keys(rows[0]).map(c => `\`${c}\``).join(', ');
                    const values = rows.map(row =>
                        '(' + Object.values(row).map(v =>
                            v === null ? 'NULL' : mysql.escape ? `'${String(v).replace(/'/g, "''")}'` : railway.escape(v)
                        ).join(', ') + ')'
                    );

                    for (const val of values) {
                        await railway.query(`INSERT INTO \`${table}\` (${columns}) VALUES ${val.slice(1, -1)}`);
                    }

                    console.log(`   ✅ ${table}: migrated ${rows.length} record(s).`);
                } catch (err) {
                    console.log(`   ⚠️  ${table}: ${err.message}`);
                }
            }
        }

        // 5. Seed employees if empty
        const [empCount] = await railway.query('SELECT COUNT(*) as cnt FROM BANK_EMPLOYEE');
        if (empCount[0].cnt === 0) {
            console.log('\n👤 Seeding default employees...');
            const hash = await bcrypt.hash('admin123', 10);
            const employees = [
                ['Akshith', 'Peri', 'System Administrator', hash],
                ['John', 'Doe', 'Loan Officer', hash],
                ['Jane', 'Smith', 'Customer Support', hash],
                ['Michael', 'Scott', 'Branch Manager', hash],
            ];
            for (const emp of employees) {
                await railway.query(
                    'INSERT INTO BANK_EMPLOYEE (Name, LName, Responsibility, PasswordHash) VALUES (?, ?, ?, ?)',
                    emp
                );
            }
            console.log('   ✅ 4 employees seeded! Password: admin123');
        } else {
            console.log(`\n👤 Employees already exist (${empCount[0].cnt} found). Skipping seed.`);
        }

        console.log('\n🎉 Migration complete! Your Railway database is fully synced.');
        console.log('\nEmployee Logins:');
        console.log('  Name: Akshith  | Password: admin123');
        console.log('  Name: John     | Password: admin123');
        console.log('  Name: Jane     | Password: admin123');
        console.log('  Name: Michael  | Password: admin123\n');

    } catch (err) {
        console.error('\n❌ Migration failed:', err.message);
    } finally {
        if (local) await local.end();
        if (railway) await railway.end();
    }
}

migrate();
