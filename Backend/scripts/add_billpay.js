const fs = require('fs');
let app = fs.readFileSync('Frontend/app.js', 'utf8');

// Add "Pay Bills" button next to "Fund Transfer" in Transactions tab
const transferBtn = `<button class="btn-new-txn" onclick="app.openTransferModal()">+ Fund Transfer</button>`;
const bothBtns = `<button class="btn-new-txn" onclick="app.openBillPayModal()"><i class="fa-solid fa-file-invoice-dollar"></i> Pay Bills</button><button class="btn-new-txn" onclick="app.openTransferModal()">+ Fund Transfer</button>`;
app = app.replace(transferBtn, bothBtns);

// Add the bill pay methods
const billLogic = `
    openBillPayModal() {
        const m = document.createElement('div');
        m.id = 'nexaModal';
        m.className = 'nexa-modal-overlay';
        m.innerHTML = \`
        <div class="nexa-modal" style="max-width: 420px">
            <div class="nexa-modal-header">
                <div class="nexa-modal-icon" style="background:rgba(16,185,129,0.12)"><i class="fa-solid fa-file-invoice-dollar" style="color:#10b981"></i></div>
                <div><div class="nexa-modal-title">UPI / Bill Payments</div><div class="nexa-modal-sub">Instant merchant payments</div></div>
            </div>
            <div class="nexa-modal-field"><label>BILLER CATEGORY</label>
                <select id="bp-category" class="nexa-modal-input">
                    <option value="Electricity Bill">Electricity</option>
                    <option value="Mobile Recharge">Mobile Recharge</option>
                    <option value="Credit Card Bill">Credit Card</option>
                    <option value="Broadband Bill">Broadband</option>
                    <option value="Water Bill">Water</option>
                </select>
            </div>
            <div class="nexa-modal-field"><label>CONSUMER / ACCOUNT / MOBILE NUMBER</label><input id="bp-acc" class="nexa-modal-input" placeholder="e.g. 9876543210"></div>
            <div class="nexa-modal-field"><label>AMOUNT (₹)</label><input id="bp-amount" class="nexa-modal-input" type="number" placeholder="500"></div>
            <div style="display:flex;gap:1rem;margin-top:1.5rem">
                <button class="btn-auth-outline" style="flex:1" onclick="this.closest('.nexa-modal-overlay').remove()">Cancel</button>
                <button class="btn-auth-submit" style="flex:1" onclick="app.processBillPayment()">Pay Now</button>
            </div>
        </div>\`;
        document.body.appendChild(m);
        setTimeout(() => m.classList.add('active'), 10);
    }

    async processBillPayment() {
        if (!this.userId) return;
        const cat = document.getElementById('bp-category').value;
        const acc = document.getElementById('bp-acc').value;
        const amt = document.getElementById('bp-amount').value;
        if (!acc || !amt || amt <= 0) { this.toast('Valid details and amount required.', 'error'); return; }

        try {
            // Find a savings account for the user to debit from
            const acR = await fetch(\`\${this.api}/accounts\`, { headers: this.getHeaders() });
            const accounts = await acR.json();
            const myAcc = accounts.find(a => a.CustID === this.userId);
            if (!myAcc) throw new Error('No active account found to debit.');

            const res = await fetch(\`\${this.api}/transactions\`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    Account_No: myAcc.Account_No,
                    CustID: this.userId,
                    Amount: amt,
                    Transaction_Type: 'DEBIT',
                    Description: \`\${cat} - \${acc}\`,
                    PayMethod: 'UPI'
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Payment failed');
            
            document.getElementById('nexaModal').remove();
            this.toast('Payment successful!', 'success');
            this.renderCustTransactions();
            
            // Also deduct balance from frontend immediately for UI responsiveness if balance is tracked (it's fetched again on dash load so we're fine)
        } catch(e) {
            this.toast(e.message, 'error');
        }
    }
`;

app = app.replace('    async openTransferModal() {', billLogic + '\n    async openTransferModal() {');

fs.writeFileSync('Frontend/app.js', app);
console.log('Added Bill Pay Simulation');
