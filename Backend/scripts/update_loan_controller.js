const fs = require('fs');
let ctrl = fs.readFileSync('Backend/controllers/loanController.js', 'utf8');

const updatedUpdateStatus = `exports.updateStatus = async (req, res) => {
    try {
        const { status } = req.body;
        await db.query('UPDATE LOAN_REQUEST SET ApprovalStatus = ? WHERE LoanID = ?', [status, req.params.id]);
        
        if (status === 'APPROVED') {
            const [loans] = await db.query('SELECT * FROM LOAN_REQUEST WHERE LoanID = ?', [req.params.id]);
            const loan = loans[0];
            if (loan && loan.TenureMonths && loan.LoanRate) {
                const P = parseFloat(loan.Requested_Amount);
                let r = parseFloat(loan.LoanRate);
                if (r === 0) r = 9.5; // Default fallback rate
                r = r / (12 * 100);
                const n = parseInt(loan.TenureMonths);
                
                const emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
                let remainingP = P;
                let emiDate = new Date();
                
                for (let i = 1; i <= n; i++) {
                    emiDate.setMonth(emiDate.getMonth() + 1);
                    const intComp = remainingP * r;
                    const prinComp = emi - intComp;
                    remainingP -= prinComp;
                    
                    await db.query(
                        \`INSERT INTO LOAN_EMI_SCHEDULE (LoanID, DueDate, EMIAmount, PrincipalComponent, InterestComponent) VALUES (?, ?, ?, ?, ?)\`,
                        [req.params.id, emiDate, emi.toFixed(2), prinComp.toFixed(2), intComp.toFixed(2)]
                    );
                }
            }
        }
        
        try {
            await db.query(
                \`INSERT INTO AUDIT_LOG_ENTRY (LogType, TxnID, LogDetails) VALUES (?, ?, ?)\`,
                ['LOAN_APPROVAL', null, \`Loan \${req.params.id} \${status}\`]
            );
        } catch(e) {}
        
        res.json({ message: 'Loan status updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getEMIs = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM LOAN_EMI_SCHEDULE WHERE LoanID = ? ORDER BY DueDate ASC', [req.params.id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
`;

ctrl = ctrl.replace(/exports\.updateStatus = async \(req, res\) => \{[\s\S]*?res\.status\(500\)\.json\(\{ error: err\.message \}\);\n    \}\n\};/, updatedUpdateStatus);

fs.writeFileSync('Backend/controllers/loanController.js', ctrl);
console.log('loanController updated with EMI schedule generation');
