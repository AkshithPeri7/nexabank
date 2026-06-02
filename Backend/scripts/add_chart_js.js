const fs = require('fs');
let app = fs.readFileSync('Frontend/app.js', 'utf8');

// Replace the HTML for cust-two-col to include the chart
const targetHtml = `        <div class="cust-two-col">
            <div class="cust-card"><div class="cust-card-header"><span class="cust-card-title">Recent Transactions</span><button class="cust-view-all" onclick="app.loadCustSection('transactions')">View All</button></div><div id="d-txns"><p class="loading-text"><i class="fa-solid fa-spinner fa-spin"></i></p></div></div>
            <div class="cust-card"><div class="cust-card-header"><span class="cust-card-title">My Accounts</span><button class="cust-view-all" onclick="app.loadCustSection('accounts')">Manage</button></div><div id="d-accts"><p class="loading-text"><i class="fa-solid fa-spinner fa-spin"></i></p></div></div>
        </div>
        <div class="cust-card" style="margin-top: 1.5rem;">
            <div class="cust-card-header"><span class="cust-card-title">Spending Analytics (All Time)</span></div>
            <div style="height: 300px; display: flex; justify-content: center; align-items: center; padding: 1rem; width: 100%;">
                <canvas id="spendChart"></canvas>
            </div>
        </div></div>`;
app = app.replace(/        <div class="cust-two-col">[\s\S]*?<\/div><\/div>`;/, targetHtml + '`;');

// Add the chart rendering logic
const chartLogic = `            const acctEl = document.getElementById('d-accts');
            acctEl.innerHTML = accounts.length ? accounts.map(a => \`<div class="dash-acct-mini"><div class="dash-acct-mini-type">\${a.AccountType||'SAVINGS'} Account</div><div class="dash-acct-mini-bal">₹\${this.fmt(a.Balance)}</div><div class="dash-acct-mini-num">•••• •••• \${String(a.Account_No).slice(-4)}</div></div>\`).join('') : '<p style="color:#999;text-align:center;padding:1rem">No accounts found.</p>';
            
            // Render Spending Analytics Chart
            const debits = txns.filter(t => t.Transaction_Type === 'DEBIT');
            let cats = { 'Transfers': 0, 'Bills & Utilities': 0, 'Shopping': 0, 'Others': 0 };
            debits.forEach(t => {
                const desc = (t.Description || '').toLowerCase();
                const amt = parseFloat(t.Amount);
                if (desc.includes('bill') || desc.includes('recharge') || desc.includes('electricity')) cats['Bills & Utilities'] += amt;
                else if (desc.includes('transfer') || desc.includes('sent')) cats['Transfers'] += amt;
                else if (desc.includes('amazon') || desc.includes('flipkart') || desc.includes('shop')) cats['Shopping'] += amt;
                else cats['Others'] += amt;
            });
            
            const ctx = document.getElementById('spendChart');
            if (ctx && window.Chart) {
                // Destroy previous instance if exists (Chart.js quirk on SPA)
                if(window.spendChartInstance) window.spendChartInstance.destroy();
                
                const hasData = Object.values(cats).some(v => v > 0);
                if (!hasData) {
                    ctx.parentElement.innerHTML = '<p style="color:var(--text3)">Not enough data to display analytics.</p>';
                } else {
                    window.spendChartInstance = new Chart(ctx, {
                        type: 'doughnut',
                        data: {
                            labels: Object.keys(cats),
                            datasets: [{
                                data: Object.values(cats),
                                backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'],
                                borderWidth: 0,
                                hoverOffset: 4
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: { position: 'right', labels: { color: this.theme === 'light' ? '#333' : '#fff' } }
                            }
                        }
                    });
                }
            }`;
app = app.replace(/            const acctEl = document\.getElementById\('d-accts'\);[\s\S]*? found\.<\/p>';/, chartLogic);

fs.writeFileSync('Frontend/app.js', app);
console.log('App.js updated with Spending Analytics Chart');
