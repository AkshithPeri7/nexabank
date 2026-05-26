const fs = require('fs');
let app = fs.readFileSync('Frontend/app.js', 'utf8');

const payeeLogic = `
    async renderCustPayees() {
        const el = document.getElementById('cust-main-content');
        el.innerHTML = \`<div class="cust-inner"><p class="loading-text"><i class="fa-solid fa-spinner fa-spin"></i> Loading Payees...</p></div>\`;
        try {
            const res = await fetch(\`\${this.api}/beneficiaries/\${this.userId}\`, { headers: this.getHeaders() });
            const payees = await res.json();
            
            el.innerHTML = \`<div class="cust-inner">
                <div class="cust-page-header">
                    <div><h1 class="cust-greeting">Beneficiaries</h1><p class="cust-greet-sub">Manage your saved payees for quick transfers</p></div>
                    <button class="btn-new-txn" onclick="app.showAddPayeeModal()">+ Add Payee</button>
                </div>
                <div class="cust-card">
                    <div class="cust-card-header"><span class="cust-card-title">Saved Payees</span></div>
                    <div class="premium-table-wrap">
                        <table class="premium-table">
                            <thead><tr><th>PAYEE NAME</th><th>ACCOUNT NUMBER</th><th>ACTIONS</th></tr></thead>
                            <tbody>\${!payees.length
                                ? \`<tr><td colspan="3" class="tbl-empty">No saved payees found.</td></tr>\`
                                : payees.map(p => \`<tr>
                                    <td>\${p.Ben_Name}</td>
                                    <td>\${p.Ben_Account_No}</td>
                                    <td><button class="btn-auth-outline" style="border-color:var(--red); color:var(--red); padding: 0.25rem 0.75rem;" onclick="app.deletePayee(\${p.Ben_ID})">Delete</button></td>
                                </tr>\`).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>\`;
        } catch(e) {
            el.innerHTML = \`<p style="color:var(--red)">Failed to load payees: \${e.message}</p>\`;
        }
    }

    showAddPayeeModal() {
        const old = document.getElementById('addPayeeModal'); if(old) old.remove();
        const ov = document.createElement('div');
        ov.className = 'nexa-modal-overlay active';
        ov.id = 'addPayeeModal';
        ov.innerHTML = \`
            <div class="nexa-modal" style="max-width: 400px">
                <div class="nexa-modal-header">
                    <h3 class="nexa-modal-title">Add New Payee</h3>
                    <button class="nexa-modal-close" onclick="this.closest('.nexa-modal-overlay').remove()"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <form id="payee-form" onsubmit="event.preventDefault(); app.addPayee();">
                    <div class="form-group" style="margin-top:1rem;">
                        <label class="form-label">Payee Name</label>
                        <input type="text" id="payee-name" class="form-input" required>
                    </div>
                    <div class="form-group" style="margin-top:1rem; margin-bottom: 1.5rem;">
                        <label class="form-label">Account Number</label>
                        <input type="number" id="payee-acc" class="form-input" required>
                    </div>
                    <button type="submit" class="btn-auth-submit" style="width:100%">Save Payee</button>
                </form>
            </div>\`;
        document.body.appendChild(ov);
    }

    async addPayee() {
        const name = document.getElementById('payee-name').value;
        const acc = document.getElementById('payee-acc').value;
        try {
            const res = await fetch(\`\${this.api}/beneficiaries/\${this.userId}\`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ Ben_Name: name, Ben_Account_No: acc })
            });
            const data = await res.json();
            if(!res.ok) throw new Error(data.error || 'Failed to add payee');
            this.toast('Payee added successfully!', 'success');
            document.getElementById('addPayeeModal').remove();
            this.renderCustPayees();
        } catch(e) {
            this.toast(e.message, 'error');
        }
    }

    async deletePayee(benId) {
        if(!confirm('Are you sure you want to delete this payee?')) return;
        try {
            const res = await fetch(\`\${this.api}/beneficiaries/\${benId}\`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });
            if(!res.ok) throw new Error('Failed to delete payee');
            this.toast('Payee deleted.', 'success');
            this.renderCustPayees();
        } catch(e) {
            this.toast(e.message, 'error');
        }
    }
`;

app = app.replace('    async renderCustTransactions() {', payeeLogic + '\n    async renderCustTransactions() {');

fs.writeFileSync('Frontend/app.js', app);
console.log('Added Payees UI logic');
