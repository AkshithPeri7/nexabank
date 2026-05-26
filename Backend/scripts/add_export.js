const fs = require('fs');
let app = fs.readFileSync('Frontend/app.js', 'utf8');

// Add the button
const buttonHtml = `<div style="display:flex;gap:0.5rem;"><button class="btn-new-txn" onclick="app.exportCustomerStatement()"><i class="fa-solid fa-download"></i> Statement</button><button class="btn-new-txn" onclick="app.openTransferModal()">+ Fund Transfer</button></div>`;
app = app.replace('<button class="btn-new-txn" onclick="app.openTransferModal()">+ Fund Transfer</button>', buttonHtml);

// Add the exportCustomerStatement method
const exportMethod = `
    async exportCustomerStatement() {
        if (!this.userId) return;
        try {
            const res = await fetch(\`\${this.api}/transactions\`, { headers: this.getHeaders() });
            const allTxns = await res.json();
            const txns = allTxns.filter(t => t.CustID === this.userId);
            if (!txns.length) {
                this.toast('No transactions to export.', 'info');
                return;
            }
            const rows = [['Transaction ID', 'Date', 'Description', 'Type', 'Amount']];
            txns.forEach(t => {
                rows.push([
                    t.Txn_ID,
                    t.Transaction_Date ? new Date(t.Transaction_Date).toLocaleDateString('en-IN') : '',
                    t.Description || 'Transfer',
                    t.Transaction_Type,
                    t.Amount
                ]);
            });
            const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(r => r.join(',')).join('\\n');
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement('a');
            link.setAttribute('href', encodedUri);
            link.setAttribute('download', 'account_statement_' + new Date().toISOString().split('T')[0] + '.csv');
            document.body.appendChild(link);
            link.click();
            link.remove();
            this.toast('Statement downloaded successfully.', 'success');
        } catch (e) {
            this.toast('Failed to download statement.', 'error');
        }
    }
`;

app = app.replace('async renderCustTransactions() {', exportMethod + '\n    async renderCustTransactions() {');

fs.writeFileSync('Frontend/app.js', app);
console.log('Added Statement Download button and logic');
