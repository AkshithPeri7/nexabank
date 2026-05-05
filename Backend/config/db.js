const mysql = require('mysql2/promise');
require('dotenv').config();

// Support Railway's full MYSQL_URL connection string OR individual vars
function getPoolConfig(includeDb = false) {
    if (process.env.MYSQL_URL) {
        // Railway provides a full connection URL — parse and use it
        const url = new URL(process.env.MYSQL_URL);
        const cfg = {
            host:             url.hostname,
            port:             parseInt(url.port) || 3306,
            user:             url.username,
            password:         url.password,
            waitForConnections: true,
            connectionLimit:  10,
            queueLimit:       0,
        };
        if (includeDb) cfg.database = url.pathname.replace('/', '');
        return cfg;
    }
    // Local development — use individual env vars
    const cfg = {
        host:             process.env.DB_HOST     || 'localhost',
        port:             parseInt(process.env.DB_PORT) || 3306,
        user:             process.env.DB_USER     || 'root',
        password:         process.env.DB_PASSWORD || '',
        waitForConnections: true,
        connectionLimit:  10,
        queueLimit:       0,
    };
    if (includeDb) cfg.database = process.env.DB_NAME || 'bank_db';
    return cfg;
}

// Pool WITHOUT database — used only for initial DB creation
const rootPool = mysql.createPool(getPoolConfig(false));

// Pool WITH database — used by all controllers
const dbPool = mysql.createPool(getPoolConfig(true));


// ── Auto-initialise database & tables ────────────────────────────
async function initDatabase() {
    const dbName = process.env.DB_NAME || 'bank_db';
    const conn   = await rootPool.getConnection();
    try {
        // 1. Create the database if it doesn't exist
        await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
        await conn.query(`USE \`${dbName}\``);

        // 2. Create all tables (safe — only if they don't exist)
        const tables = [
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
                BranchID    INT,
                AccountType VARCHAR(50) DEFAULT 'SAVINGS',
                Balance     DECIMAL(15,2) DEFAULT 0.00,
                CreatedAt   DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (CustID) REFERENCES BANK_CUSTOMER(Cust_ID) ON DELETE SET NULL
            )`,
            `CREATE TABLE IF NOT EXISTS ACCOUNT_HOLDER (
                HolderID     INT PRIMARY KEY AUTO_INCREMENT,
                Account_No   INT,
                Cust_ID      INT,
                HolderName   VARCHAR(100),
                HolderType   VARCHAR(50),
                DOB          DATE,
                ContactNo    VARCHAR(15),
                Email        VARCHAR(150),
                Address      TEXT,
                Relationship VARCHAR(50) DEFAULT 'SELF',
                IDProofType  VARCHAR(50) DEFAULT 'AADHAAR',
                FOREIGN KEY (Account_No) REFERENCES ACCOUNT(Account_No) ON DELETE CASCADE,
                FOREIGN KEY (Cust_ID)    REFERENCES BANK_CUSTOMER(Cust_ID) ON DELETE SET NULL
            )`,
            `CREATE TABLE IF NOT EXISTS \`TRANSACTION\` (
                Txn_ID           INT PRIMARY KEY AUTO_INCREMENT,
                Amount           DECIMAL(15,2),
                Transaction_Type ENUM('CREDIT','DEBIT') DEFAULT 'DEBIT',
                Description      VARCHAR(255),
                Transaction_Date DATETIME DEFAULT CURRENT_TIMESTAMP,
                PayMethod        VARCHAR(50),
                CustID           INT,
                Account_No       INT,
                FOREIGN KEY (CustID)     REFERENCES BANK_CUSTOMER(Cust_ID) ON DELETE SET NULL,
                FOREIGN KEY (Account_No) REFERENCES ACCOUNT(Account_No)    ON DELETE SET NULL
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
                LoanID             INT PRIMARY KEY AUTO_INCREMENT,
                Cust_ID            INT,
                Requested_Amount   DECIMAL(15,2),
                LoanRate           DECIMAL(5,2),
                TenureMonths       INT,
                ApprovalStatus     ENUM('PENDING','APPROVED','REJECTED') DEFAULT 'PENDING',
                PickupDate         DATE,
                PickupLocation     VARCHAR(255),
                AppcelationDetails TEXT,
                CreatedAt          DATETIME DEFAULT CURRENT_TIMESTAMP,
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
                LogType      VARCHAR(50),
                LogTimestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                LogDetails   TEXT,
                FOREIGN KEY (TxnID)    REFERENCES \`TRANSACTION\`(Txn_ID)       ON DELETE SET NULL,
                FOREIGN KEY (DetailID) REFERENCES LOAN_TERM_DETAIL(DetailID) ON DELETE SET NULL
            )`,
            `CREATE TABLE IF NOT EXISTS EMPLOYEE_SUPERVISES_CUSTOMER (
                EID     INT,
                Cust_ID INT,
                PRIMARY KEY (EID, Cust_ID),
                FOREIGN KEY (EID)     REFERENCES BANK_EMPLOYEE(EID)        ON DELETE CASCADE,
                FOREIGN KEY (Cust_ID) REFERENCES BANK_CUSTOMER(Cust_ID)   ON DELETE CASCADE
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

        for (const sql of tables) {
            await conn.query(sql);
        }

        // 3. Seed default employees if none exists (password: admin123)
        const [admins] = await conn.query('SELECT COUNT(*) AS cnt FROM BANK_EMPLOYEE');
        if (admins[0].cnt === 0) {
            const bcrypt = require('bcryptjs');
            const hash   = await bcrypt.hash('admin123', 10);
            const employees = [
                ['Akshith', 'Peri', 'System Administrator', hash],
                ['John', 'Doe', 'Loan Officer', hash],
                ['Jane', 'Smith', 'Customer Support', hash],
                ['Michael', 'Scott', 'Branch Manager', hash]
            ];
            for (const emp of employees) {
                await conn.query(
                    `INSERT INTO BANK_EMPLOYEE (Name, LName, Responsibility, PasswordHash) VALUES (?, ?, ?, ?)`,
                    emp
                );
            }
            console.log('✅ Default employees created — Password for all: admin123');
        }

        console.log(`✅ Database "${dbName}" ready — all tables verified.`);
    } finally {
        conn.release();
    }
}

module.exports = { db: dbPool, initDatabase };