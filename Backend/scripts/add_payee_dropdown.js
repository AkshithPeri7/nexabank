const fs = require('fs');
let app = fs.readFileSync('Frontend/app.js', 'utf8');

// Change openTransferModal() to async openTransferModal()
app = app.replace('openTransferModal() {', 'async openTransferModal() {');

// Inject the payee loading logic
const payeeLogic = `
        let payeeOptions = '<option value="">-- Choose Payee --</option>';
        try {
            if(this.userId) {
                const res = await fetch(\`\${this.api}/beneficiaries/\${this.userId}\`, { headers: this.getHeaders() });
                const payees = await res.json();
                if(payees.length) {
                    payeeOptions += payees.map(p => \`<option value="\${p.Ben_Account_No}">\${p.Ben_Name} - \${p.Ben_Account_No}</option>\`).join('');
                }
            }
        } catch(e) {}
`;

app = app.replace("        const m = document.createElement('div');", payeeLogic + "\n        const m = document.createElement('div');");

// Inject the select dropdown into the modal HTML
const payeeDropdown = `            <div class="nexa-modal-field"><label>SAVED PAYEE</label>
                <select class="nexa-modal-input" onchange="if(this.value) document.getElementById('tf-acct').value = this.value;">
                    \${payeeOptions}
                </select>
            </div>`;

app = app.replace('            <div class="nexa-modal-field"><label>CUSTOMER ID <span style="text-transform:none;color:#9ca3af;font-weight:normal">(Optional)</span></label><input id="tf-cust" class="nexa-modal-input" placeholder="e.g. 2001"></div>', 
    payeeDropdown + '\n            <div class="nexa-modal-field"><label>CUSTOMER ID <span style="text-transform:none;color:#9ca3af;font-weight:normal">(Optional)</span></label><input id="tf-cust" class="nexa-modal-input" placeholder="e.g. 2001"></div>');

fs.writeFileSync('Frontend/app.js', app);
console.log('Transfer modal updated with Payee dropdown');
