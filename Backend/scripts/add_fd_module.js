const fs = require('fs');
let app = fs.readFileSync('Frontend/app.js', 'utf8');

const fdLogic = `
    async renderCustInvestments() {
        const el = document.getElementById('cust-main-content');
        el.innerHTML = \`<div class="cust-inner"><p class="loading-text"><i class="fa-solid fa-spinner fa-spin"></i></p></div>\`;
        try {
            const [resInv, resFD] = await Promise.all([
                fetch(\`\${this.api}/investments\`, { headers: this.getHeaders() }),
                fetch(\`\${this.api}/fixed-deposits/\${this.userId}\`, { headers: this.getHeaders() })
            ]);
            let invs = await resInv.json();
            invs = invs.filter(i => i.Cust_ID === this.userId);
            
            let fds = [];
            if(resFD.ok) fds = await resFD.json();

            el.innerHTML = \`<div class="cust-inner">
            <div class="cust-page-header">
                <div><h1 class="cust-greeting">Investments & FDs</h1><p class="cust-greet-sub">Grow your wealth safely</p></div>
                <div style="display:flex;gap:0.5rem">
                    <button class="btn-new-txn" onclick="app.openFDModal()"><i class="fa-solid fa-piggy-bank"></i> Book FD</button>
                    <button class="btn-new-txn" onclick="app.applyInvestment()">+ New Investment</button>
                </div>
            </div>
            
            <!-- FIXED DEPOSITS TABLE -->
            <div class="cust-card" style="margin-bottom:1.5rem">
                <div class="cust-card-header"><span class="cust-card-title">My Fixed Deposits (FDs)</span></div>
                <div class="premium-table-wrap">
                <table class="premium-table">
                    <thead><tr><th>FD ID</th><th>PRINCIPAL</th><th>RATE</th><th>TENURE</th><th>MATURITY DATE</th><th>MATURITY AMT</th><th>STATUS</th></tr></thead>
                    <tbody>\${!fds.length ? \`<tr><td colspan="7" class="tbl-empty">No active Fixed Deposits found.</td></tr>\` : fds.map(f => \`
                            <tr>
                                <td class="tbl-id">FD\${String(f.FD_ID).padStart(4,'0')}</td>
                                <td>₹\${this.fmt(f.Principal)}</td>
                                <td>\${f.InterestRate}%</td>
                                <td>\${f.TenureMonths} Months</td>
                                <td>\${f.MaturityDate?new Date(f.MaturityDate).toLocaleDateString('en-IN'):'—'}</td>
                                <td style="color:var(--green)">₹\${this.fmt(f.MaturityAmount)}</td>
                                <td><span class="tbl-badge \${f.Status==='ACTIVE'?'badge-green':'badge-gold'}">\${f.Status}</span></td>
                            </tr>\`).join('')}
                    </tbody>
                </table>
                </div>
            </div>

            <!-- OTHER INVESTMENTS TABLE -->
            <div class="cust-card">
                <div class="cust-card-header"><span class="cust-card-title">Other Investments</span></div>
                <div class="premium-table-wrap">
                <table class="premium-table">
                    <thead><tr><th>ID</th><th>TYPE</th><th>AMOUNT</th><th>DURATION</th><th>STATUS</th><th>DATE</th></tr></thead>
                    <tbody>\${!invs.length ? \`<tr><td colspan="6" class="tbl-empty">No investments found.</td></tr>\` : invs.map(i => \`
                            <tr>
                                <td class="tbl-id">INV\${String(i.InvestID).padStart(4,'0')}</td>
                                <td>\${i.InvestType}</td>
                                <td>₹\${this.fmt(i.Amount)}</td>
                                <td>\${i.DurationMonths}mo</td>
                                <td><span class="tbl-badge \${i.Status==='ACTIVE'?'badge-green':'badge-gold'}">\${i.Status}</span></td>
                                <td>\${i.CreatedAt?new Date(i.CreatedAt).toLocaleDateString('en-IN'):'—'}</td>
                            </tr>\`).join('')}
                    </tbody>
                </table>
                </div>
            </div></div>\`;
        } catch(e) { el.innerHTML = \`<p class="error-text">Could not load investments.</p>\`; }
    }

    openFDModal() {
        const m = document.createElement('div');
        m.id = 'nexaModal';
        m.className = 'nexa-modal-overlay';
        m.innerHTML = \`
        <div class="nexa-modal" style="max-width: 450px">
            <div class="nexa-modal-header">
                <div class="nexa-modal-icon" style="background:rgba(245,158,11,0.12)"><i class="fa-solid fa-piggy-bank" style="color:#f59e0b"></i></div>
                <div><div class="nexa-modal-title">Book Fixed Deposit</div><div class="nexa-modal-sub">Earn up to 7.5% p.a.</div></div>
            </div>
            <div class="nexa-modal-field"><label>PRINCIPAL AMOUNT (₹)</label><input id="fd-principal" class="nexa-modal-input" type="number" placeholder="min. 10000" oninput="app.calcFDMaturity()"></div>
            <div class="nexa-modal-field"><label>TENURE (Months)</label>
                <select id="fd-tenure" class="nexa-modal-input" onchange="app.calcFDMaturity()">
                    <option value="6">6 Months (5.0%)</option>
                    <option value="12">1 Year (6.5%)</option>
                    <option value="24">2 Years (6.5%)</option>
                    <option value="36">3 Years (7.0%)</option>
                    <option value="60">5 Years (7.5%)</option>
                </select>
            </div>
            
            <div style="background: var(--bg); padding: 1rem; border-radius: 8px; margin-top: 1rem; border: 1px solid var(--border);">
                <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;"><span style="color:var(--text2)">Interest Rate</span><strong id="fd-rate-disp">5.0% p.a.</strong></div>
                <div style="display:flex; justify-content:space-between;"><span style="color:var(--text2)">Estimated Maturity</span><strong id="fd-mat-disp" style="color:var(--green)">₹0.00</strong></div>
            </div>

            <div style="display:flex;gap:1rem;margin-top:1.5rem">
                <button class="btn-auth-outline" style="flex:1" onclick="this.closest('.nexa-modal-overlay').remove()">Cancel</button>
                <button class="btn-auth-submit" style="flex:1" onclick="app.bookFD()">Confirm Booking</button>
            </div>
        </div>\`;
        document.body.appendChild(m);
        setTimeout(() => m.classList.add('active'), 10);
    }

    calcFDMaturity() {
        const pInput = document.getElementById('fd-principal').value;
        const p = parseFloat(pInput) || 0;
        const t = parseInt(document.getElementById('fd-tenure').value);
        let rate = 5.0;
        if(t >= 12) rate = 6.5;
        if(t >= 36) rate = 7.0;
        if(t >= 60) rate = 7.5;
        
        document.getElementById('fd-rate-disp').textContent = rate.toFixed(1) + '% p.a.';
        const mat = p + (p * rate * (t/12) / 100);
        document.getElementById('fd-mat-disp').textContent = '₹' + this.fmt(mat);
    }

    async bookFD() {
        if(!this.userId) return;
        const principal = document.getElementById('fd-principal').value;
        const tenure = document.getElementById('fd-tenure').value;
        if(!principal || principal < 1000) {
            this.toast('Minimum principal amount is ₹1,000', 'error');
            return;
        }

        try {
            // Check balance
            const acR = await fetch(\`\${this.api}/accounts\`, { headers: this.getHeaders() });
            const accounts = await acR.json();
            const myAcc = accounts.find(a => a.CustID === this.userId);
            if(!myAcc || parseFloat(myAcc.Balance) < principal) {
                throw new Error('Insufficient balance in savings account to book FD.');
            }

            const res = await fetch(\`\${this.api}/fixed-deposits/\${this.userId}\`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ Principal: principal, TenureMonths: tenure })
            });
            const data = await res.json();
            if(!res.ok) throw new Error(data.error || 'Failed to book FD');

            // Debit the account
            await fetch(\`\${this.api}/transactions\`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    Account_No: myAcc.Account_No,
                    CustID: this.userId,
                    Amount: principal,
                    Transaction_Type: 'DEBIT',
                    Description: 'Fixed Deposit Booking',
                    PayMethod: 'INTERNAL'
                })
            });

            document.getElementById('nexaModal').remove();
            this.toast('Fixed Deposit booked successfully!', 'success');
            this.renderCustInvestments();
        } catch(e) {
            this.toast(e.message, 'error');
        }
    }
`;

// Extract old renderCustInvestments
const idx1 = app.indexOf('    async renderCustInvestments() {');
const idx2 = app.indexOf('    async renderCustCreditCards() {');
if(idx1 !== -1 && idx2 !== -1) {
    app = app.substring(0, idx1) + fdLogic + '\n' + app.substring(idx2);
    fs.writeFileSync('Frontend/app.js', app);
    console.log('FD module added to app.js');
} else {
    console.log('Failed to inject FD logic.');
}
