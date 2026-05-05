class NexaBank {
    constructor() {
        this.api = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? 'http://localhost:5000/api'
            : 'https://nexabank-production.up.railway.app/api';
        this.token = localStorage.getItem('nx_token');
        this.userType = localStorage.getItem('nx_type');
        this.userName = localStorage.getItem('nx_name');
        this.userId = localStorage.getItem('nx_id');
        this.theme = localStorage.getItem('nx_theme') || 'dark';
        this.selectedAccountType = 'SAVINGS';
        this.currentStep = 1;
        this.init();
    }

    init() {
        this.applyTheme(this.theme);
        this.handleSupabaseRedirect();
        if (this.token && this.userType) {
            this.showPage(this.userType === 'employee' ? 'employee-dash' : 'customer-dash');
        } else {
            this.showPage('landing');
        }
    }

    // ─── NAVIGATION ───────────────────────────────────────────
    showPage(page) {
        const pages = ['page-landing','page-login','page-admin-login','page-open-account','page-success','page-customer-dash','page-employee-dash'];
        pages.forEach(p => {
            const el = document.getElementById(p);
            if (el) el.classList.add('hidden');
        });
        const map = {
            'landing':       'page-landing',
            'login':         'page-login',
            'admin-login':   'page-admin-login',
            'open-account':  'page-open-account',
            'success':       'page-success',
            'customer-dash': 'page-customer-dash',
            'employee-dash': 'page-employee-dash'
        };
        const target = document.getElementById(map[page]);
        if (target) target.classList.remove('hidden');

        if (page === 'login') {
            const loginForm = document.getElementById('login-form');
            if (loginForm) loginForm.reset();
            const errDiv = document.getElementById('login-error');
            if (errDiv) errDiv.classList.add('hidden');
        }
        
        if (page === 'admin-login') {
            const adminForm = document.getElementById('admin-login-form');
            if (adminForm) adminForm.reset();
            const errDiv = document.getElementById('admin-login-error');
            if (errDiv) errDiv.classList.add('hidden');
        }

        if (page === 'customer-dash') {
            const name = this.userName || 'User';
            document.getElementById('dash-user-name').textContent = name;
            document.getElementById('cust-topbar-name').textContent = name;
            document.getElementById('cust-avatar').textContent = name.charAt(0).toUpperCase();
            this.loadCustSection('dashboard');
        }
        if (page === 'employee-dash') {
            const empNameEl = document.getElementById('emp-dash-name');
            if (empNameEl) empNameEl.textContent = this.userName || 'Admin';
            this.loadEmpSection('overview');
        }
        if (page === 'open-account') {
            this.goToStep(1);
        }
        window.scrollTo(0, 0);
    }

    // ─── THEME ─────────────────────────────────────────────────
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.theme = theme;
        localStorage.setItem('nx_theme', theme);
    }

    cycleTheme() {
        const themes = ['dark', 'light', 'neon', 'ocean', 'emerald', 'cyberpunk'];
        const idx = themes.indexOf(this.theme);
        this.applyTheme(themes[(idx + 1) % themes.length]);
    }

    // ─── AUTH PORTALS ──────────────────────────────────────────
    setPortal(type) {
        document.getElementById('login-portal').value = type;
        document.querySelectorAll('.portal-tab').forEach(t => t.classList.remove('active'));
        document.getElementById(`tab-${type}`).classList.add('active');
    }

    togglePass(id) {
        const input = document.getElementById(id);
        input.type = input.type === 'password' ? 'text' : 'password';
    }

    // ─── LOGIN ─────────────────────────────────────────────────
    async handleLogin(e) {
        e.preventDefault();
        const errDiv = document.getElementById('login-error');
        errDiv.classList.add('hidden');
        const btn = document.getElementById('login-btn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying...';

        const type  = document.getElementById('login-portal').value;
        const fName = document.getElementById('login-fname').value.trim();
        const password = document.getElementById('login-password').value;

        try {
            const res  = await fetch(`${this.api}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, fName, password })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Login failed');

            this.token    = data.token;
            this.userType = type;
            this.userName = data.user?.fName || fName;
            this.userId   = data.user?.id;
            localStorage.setItem('nx_token',  this.token);
            localStorage.setItem('nx_type',   this.userType);
            localStorage.setItem('nx_name',   this.userName);
            if (this.userId) localStorage.setItem('nx_id', this.userId);

            this.showPage(type === 'employee' ? 'employee-dash' : 'customer-dash');
        } catch (err) {
            errDiv.textContent = err.message;
            errDiv.classList.remove('hidden');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<span>SECURE LOGIN</span><i class="fa-solid fa-arrow-right-to-bracket"></i>';
        }
    }

    // ─── ADMIN LOGIN ───────────────────────────────────────────
    async handleAdminLogin(e) {
        e.preventDefault();
        const errDiv = document.getElementById('admin-login-error');
        errDiv.classList.add('hidden');
        const btn = document.getElementById('admin-login-btn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...';

        const type  = document.getElementById('admin-login-portal').value; // 'employee'
        const fName = document.getElementById('admin-login-fname').value.trim();
        const password = document.getElementById('admin-login-password').value;

        try {
            const res  = await fetch(`${this.api}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, fName, password })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Authentication failed');

            this.token    = data.token;
            this.userType = type;
            this.userName = data.user?.fName || fName;
            this.userId   = data.user?.id;
            localStorage.setItem('nx_token',  this.token);
            localStorage.setItem('nx_type',   this.userType);
            localStorage.setItem('nx_name',   this.userName);
            if (this.userId) localStorage.setItem('nx_id', this.userId);

            this.showPage('employee-dash');
        } catch (err) {
            errDiv.textContent = err.message;
            errDiv.classList.remove('hidden');
        } finally {
            btn.disabled = false;
            btn.innerHTML = 'Access Admin Portal →';
        }
    }

    // ─── OPEN ACCOUNT (3 STEPS) ────────────────────────────────
    goToStep(step) {
        [1,2,3].forEach(s => {
            const card = document.getElementById(`step-${s}`);
            const dot  = document.getElementById(`step-dot-${s}`);
            if (!card || !dot) return;
            if (s === step) {
                card.classList.remove('hidden');
                dot.classList.add('active');
                dot.classList.remove('done');
            } else if (s < step) {
                card.classList.add('hidden');
                dot.classList.remove('active');
                dot.classList.add('done');
            } else {
                card.classList.add('hidden');
                dot.classList.remove('active', 'done');
            }
        });
        this.currentStep = step;
    }

    nextStep(step) {
        if (step === 2) {
            // Validate step 1
            const fields = ['reg-fname','reg-lname','reg-email','reg-phone','reg-dob'];
            for (const f of fields) {
                if (!document.getElementById(f).value.trim()) {
                    alert('Please fill in all personal details.'); return;
                }
            }
        }
        if (step === 3) {
            const deposit = document.getElementById('reg-deposit').value;
            if (!deposit || parseFloat(deposit) < 500) {
                alert('Minimum deposit is ₹500.'); return;
            }
        }
        this.goToStep(step);
    }

    selectAccountType(type) {
        this.selectedAccountType = type;
        document.querySelectorAll('.account-type-card').forEach(c => c.classList.remove('selected'));
        document.getElementById(`type-${type.toLowerCase().replace('_','')}`).classList.add('selected');
    }

    async handleSignup() {
        const errDiv = document.getElementById('signup-error');
        errDiv.classList.add('hidden');
        const btn = document.getElementById('signup-btn');

        const pwd  = document.getElementById('reg-password').value;
        const cpwd = document.getElementById('reg-confirm-password').value;
        if (pwd !== cpwd) {
            errDiv.textContent = 'Passwords do not match.';
            errDiv.classList.remove('hidden'); return;
        }
        if (pwd.length < 8) {
            errDiv.textContent = 'Password must be at least 8 characters.';
            errDiv.classList.remove('hidden'); return;
        }

        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Opening Account...';

        const payload = {
            type:    'customer',
            fName:   document.getElementById('reg-fname').value.trim(),
            lName:   document.getElementById('reg-lname').value.trim(),
            email:   document.getElementById('reg-email').value.trim(),
            phone:   document.getElementById('reg-phone').value.trim(),
            dob:     document.getElementById('reg-dob').value,
            address: document.getElementById('reg-address').value.trim(),
            idProof: document.getElementById('reg-idproof').value,
            accountType: this.selectedAccountType,
            deposit: document.getElementById('reg-deposit').value,
            password: pwd
        };

        try {
            const res  = await fetch(`${this.api}/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Registration failed');

            document.getElementById('success-message').textContent =
                `Welcome, ${payload.fName}! Your NexaBank ${this.selectedAccountType} account has been created. You can now login to Net Banking.`;
            this.showPage('success');
        } catch (err) {
            errDiv.textContent = err.message;
            errDiv.classList.remove('hidden');
        } finally {
            btn.disabled = false;
            btn.innerHTML = 'Open Account <i class="fa-solid fa-check"></i>';
        }
    }

    // ─── SUPABASE GOOGLE AUTH ──────────────────────────────────
    async loginWithGoogle() {
        if (!window.supabase) {
            alert('Supabase is not initialized. Please configure it in index.html first!');
            return;
        }
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin + window.location.pathname
                }
            });
            if (error) throw error;
        } catch (err) {
            alert('Google login failed: ' + err.message);
        }
    }

    async handleSupabaseRedirect() {
        if (!window.supabase) return;
        
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) console.error('Supabase session error:', error);
        
        if (session && session.user) {
            const email = session.user.email;
            const fName = session.user.user_metadata?.first_name || session.user.user_metadata?.full_name?.split(' ')[0] || 'User';
            const lName = session.user.user_metadata?.last_name || '';

            try {
                // We show loading state on landing
                const btn = document.getElementById('login-btn');
                if(btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...';

                const res = await fetch(`${this.api}/auth/google`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, fName, lName })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Backend sync failed');

                localStorage.setItem('nx_token', data.token);
                localStorage.setItem('nx_type', 'customer');
                localStorage.setItem('nx_name', data.user.fName);
                localStorage.setItem('nx_id', data.user.id);
                this.token = data.token;
                this.userType = 'customer';
                this.userName = data.user.fName;
                this.userId = data.user.id;
                this.showPage('customer-dash');
                
                // Clear the supabase hash from the URL
                window.history.replaceState({}, document.title, window.location.pathname);
                
                // Sign out of supabase to prevent persistent session loops
                await supabase.auth.signOut();
            } catch (err) {
                alert('Google Authentication Backend Sync Error: ' + err.message);
            }
        }
    }

    // ─── LOGOUT ────────────────────────────────────────────────
    logout() {
        ['nx_token','nx_type','nx_name','nx_id'].forEach(k => localStorage.removeItem(k));
        this.token = this.userType = this.userName = this.userId = null;
        const loginForm = document.getElementById('login-form');
        if (loginForm) loginForm.reset();
        this.showPage('landing');
    }

    // ─── HELPERS ──────────────────────────────────────────────
    getHeaders() {
        return { 
            'Content-Type': 'application/json', 
            'Authorization': `Bearer ${this.token}`
        };
    }

    fmt(n) { return parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }); }

    // ─── CUSTOMER DASHBOARD ────────────────────────────────────
    loadCustSection(section) {
        document.querySelectorAll('.cust-nav-link').forEach(a => a.classList.remove('active'));
        const link = document.getElementById(`cnav-${section}`);
        if (link) link.classList.add('active');

        if (section === 'dashboard')    this.renderCustDashboard();
        if (section === 'accounts')     this.renderCustAccounts();
        if (section === 'transactions') this.renderCustTransactions();
        if (section === 'loans')        this.renderCustLoans();
        if (section === 'investments')  this.renderCustInvestments();
        if (section === 'creditcards')  this.renderCustCreditCards();
        if (section === 'profile')      this.renderProfile();
    }

    async renderCustDashboard() {
        const el = document.getElementById('cust-main-content');
        const h = new Date().getHours();
        const greet = h < 12 ? 'Good Morning' : h < 18 ? 'Good Afternoon' : 'Good Evening';
        const name = this.userName || 'User';
        const cid = this.userId ? ` | Cust ID: ${this.userId}` : '';
        el.innerHTML = `<div class="cust-inner">
        <div class="cust-page-header">
            <div><h1 class="cust-greeting">${greet}, ${name}${cid} 👋</h1><p class="cust-greet-sub">Your financial overview for today</p></div>
            <button class="btn-new-txn" onclick="app.loadCustSection('transactions')">+ New Transaction</button>
        </div>
        <div class="cust-stats">
            <div class="cust-stat"><div class="cust-stat-num" id="cs-bal">—</div><div class="cust-stat-lbl">TOTAL BALANCE</div><div class="cust-stat-sub">↑ Active</div></div>
            <div class="cust-stat"><div class="cust-stat-num" id="cs-acct">—</div><div class="cust-stat-lbl">ACCOUNTS</div><div class="cust-stat-sub" style="color:#3b82f6">My accounts</div></div>
            <div class="cust-stat"><div class="cust-stat-num" id="cs-txn">—</div><div class="cust-stat-lbl">TRANSACTIONS</div><div class="cust-stat-sub" style="color:#10b981">All records</div></div>
            <div class="cust-stat"><div class="cust-stat-num" id="cs-loan">—</div><div class="cust-stat-lbl">LOANS</div><div class="cust-stat-sub" style="color:#ef4444">Check status</div></div>
        </div>
        <div class="cust-card">
            <div class="cust-card-header"><span class="cust-card-title">Quick Actions</span></div>
            <div class="qa-grid">
                <button class="qa-btn" onclick="app.loadCustSection('transactions')"><div class="qa-icon">💸</div>Fund Transfer</button>
                <button class="qa-btn" onclick="app.loadCustSection('loans')"><div class="qa-icon">📋</div>Apply Loan</button>
                <button class="qa-btn" onclick="app.loadCustSection('accounts')"><div class="qa-icon">🏦</div>My Accounts</button>
                <button class="qa-btn" onclick="app.loadCustSection('profile')"><div class="qa-icon">👤</div>My Profile</button>
                <button class="qa-btn" onclick="app.loadCustSection('transactions')"><div class="qa-icon">📄</div>Statement</button>
                <button class="qa-btn" onclick="app.showPage('open-account')"><div class="qa-icon">➕</div>Open Account</button>
                <button class="qa-btn" onclick="app.loadCustSection('loans')"><div class="qa-icon">🔄</div>Loan Status</button>
                <button class="qa-btn" onclick="app.loadCustSection('transactions')"><div class="qa-icon">🔍</div>Audit Log</button>
            </div>
        </div>
        <div class="cust-two-col">
            <div class="cust-card"><div class="cust-card-header"><span class="cust-card-title">Recent Transactions</span><button class="cust-view-all" onclick="app.loadCustSection('transactions')">View All</button></div><div id="d-txns"><p class="loading-text"><i class="fa-solid fa-spinner fa-spin"></i></p></div></div>
            <div class="cust-card"><div class="cust-card-header"><span class="cust-card-title">My Accounts</span><button class="cust-view-all" onclick="app.loadCustSection('accounts')">Manage</button></div><div id="d-accts"><p class="loading-text"><i class="fa-solid fa-spinner fa-spin"></i></p></div></div>
        </div></div>`;
        try {
            const [acR, trR, lnR] = await Promise.all([
                fetch(`${this.api}/accounts`, { headers: this.getHeaders() }),
                fetch(`${this.api}/transactions`, { headers: this.getHeaders() }),
                fetch(`${this.api}/loans`, { headers: this.getHeaders() })
            ]);
            let accounts = await acR.json(), txns = await trR.json(), loans = await lnR.json();
            accounts = accounts.filter(a => a.CustID === this.userId);
            txns = txns.filter(t => t.CustID === this.userId);
            loans = loans.filter(l => l.Cust_ID === this.userId);
            const totalBal = accounts.reduce((s,a) => s + parseFloat(a.Balance||0), 0);
            document.getElementById('cs-bal').textContent = '₹'+this.fmt(totalBal);
            document.getElementById('cs-acct').textContent = accounts.length;
            document.getElementById('cs-txn').textContent = txns.length;
            document.getElementById('cs-loan').textContent = loans.length;
            const txnEl = document.getElementById('d-txns');
            txnEl.innerHTML = txns.length ? txns.slice(0,5).map(t => {
                const c = t.Transaction_Type==='CREDIT';
                return `<div class="dash-txn-row"><div class="dash-txn-icon ${c?'txn-credit':'txn-debit'}"><i class="fa-solid fa-${c?'arrow-down':'arrow-up'}"></i></div><div class="dash-txn-info"><span class="dash-txn-desc">${t.Description||'Transfer'}</span><span class="dash-txn-date">${t.Transaction_Date?new Date(t.Transaction_Date).toLocaleDateString('en-IN'):'—'}</span></div><div class="dash-txn-amount" style="color:${c?'#16a34a':'#dc2626'}">${c?'+':'-'}₹${this.fmt(t.Amount)}</div></div>`;
            }).join('') : '<p style="color:#999;text-align:center;padding:1rem">No transactions yet.</p>';
            const acctEl = document.getElementById('d-accts');
            acctEl.innerHTML = accounts.length ? accounts.map(a => `<div class="dash-acct-mini"><div class="dash-acct-mini-type">${a.AccountType||'SAVINGS'} Account</div><div class="dash-acct-mini-bal">₹${this.fmt(a.Balance)}</div><div class="dash-acct-mini-num">•••• •••• ${String(a.Account_No).slice(-4)}</div></div>`).join('') : '<p style="color:#999;text-align:center;padding:1rem">No accounts found.</p>';
        } catch {}
    }

    async renderCustAccounts() {
        const el = document.getElementById('cust-main-content');
        el.innerHTML = `<h2 class="section-title">My Accounts</h2><p class="loading-text"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</p>`;
        try {
            const [acR, trR] = await Promise.all([
                fetch(`${this.api}/accounts`, { headers: this.getHeaders() }),
                fetch(`${this.api}/transactions`, { headers: this.getHeaders() })
            ]);
            let accounts = await acR.json();
            let txns = await trR.json();
            accounts = accounts.filter(a => a.CustID === this.userId);
            txns = txns.filter(t => t.CustID === this.userId);

            let html = `<h2 class="section-title">My Accounts</h2><div class="acct-cards">`;
            if (accounts.length === 0) {
                html += `<p class="loading-text">No accounts found.</p>`;
            } else {
                accounts.forEach(a => {
                    html += `<div class="acct-card">
                        <p class="acct-type">${a.AccountType || 'SAVINGS'} Account</p>
                        <p class="acct-num">${String(a.Account_No).replace(/(.{4})/g,'$1 ').trim()}</p>
                        <h2 class="acct-balance">₹${this.fmt(a.Balance)}</h2>
                        <p class="acct-balance-label">Available Balance</p>
                    </div>`;
                });
            }
            html += `</div>`;

            // Recent transactions
            html += `<h2 class="section-title" style="margin-top:2rem">Recent Transactions</h2>
            <div class="data-wrap"><table>
                <thead><tr><th>Date</th><th>Description</th><th>Type</th><th>Amount</th></tr></thead>
                <tbody>`;
            if (!txns.length) {
                html += `<tr><td colspan="4" style="text-align:center; color:var(--text3)">No transactions found.</td></tr>`;
            } else {
                txns.slice(0,10).forEach(t => {
                    const isCredit = t.Transaction_Type === 'CREDIT';
                    html += `<tr>
                        <td>${t.Transaction_Date ? new Date(t.Transaction_Date).toLocaleDateString('en-IN') : '—'}</td>
                        <td>${t.Description || 'Transfer'}</td>
                        <td><span class="badge ${isCredit ? 'badge-green' : 'badge-red'}">${t.Transaction_Type}</span></td>
                        <td style="font-weight:700; color:${isCredit ? 'var(--green)' : 'var(--red)'}">${isCredit ? '+' : '-'}₹${this.fmt(t.Amount)}</td>
                    </tr>`;
                });
            }
            html += `</tbody></table></div>`;
            el.innerHTML = html;
        } catch {
            el.innerHTML = `<h2 class="section-title">My Accounts</h2><p class="error-text"><i class="fa-solid fa-triangle-exclamation"></i> Could not connect to the server. Please ensure the backend is running.</p>`;
        }
    }

    async renderCustTransactions() {
        const el = document.getElementById('cust-main-content');
        el.innerHTML = `<div class="cust-inner"><p class="loading-text"><i class="fa-solid fa-spinner fa-spin"></i></p></div>`;
        try {
            const res  = await fetch(`${this.api}/transactions`, { headers: this.getHeaders() });
            let txns = await res.json();
            txns = txns.filter(t => t.CustID === this.userId);
            el.innerHTML = `<div class="cust-inner">
            <div class="cust-page-header">
                <div><h1 class="cust-greeting">Transactions</h1><p class="cust-greet-sub">All your transaction history</p></div>
                <button class="btn-new-txn" onclick="app.openTransferModal()">+ Fund Transfer</button>
            </div>
            <div class="cust-card">
                <div class="cust-card-header"><span class="cust-card-title">All Transactions</span></div>
                <div class="premium-table-wrap">
                <table class="premium-table">
                    <thead><tr><th>ID</th><th>DATE</th><th>DESCRIPTION</th><th>TYPE</th><th>AMOUNT</th><th>STATUS</th></tr></thead>
                    <tbody>${!txns.length
                        ? `<tr><td colspan="6" class="tbl-empty">No transactions yet.</td></tr>`
                        : txns.map(t => {
                            const c = t.Transaction_Type==='CREDIT';
                            return `<tr>
                                <td class="tbl-id">#${t.Txn_ID}</td>
                                <td>${t.Transaction_Date ? new Date(t.Transaction_Date).toLocaleDateString('en-IN') : '—'}</td>
                                <td>${t.Description||'Transfer'}</td>
                                <td><span class="tbl-badge ${c?'badge-green':'badge-red'}">${t.Transaction_Type}</span></td>
                                <td class="tbl-amount" style="color:${c?'#16a34a':'#dc2626'}">${c?'+':'-'}₹${this.fmt(t.Amount)}</td>
                                <td><span class="tbl-badge badge-blue">Completed</span></td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
                </div>
            </div></div>`;
        } catch {
            el.innerHTML = `<div class="cust-inner"><p class="error-text">Could not load transactions.</p></div>`;
        }
    }

    async renderCustLoans(filter = 'ALL') {
        const el = document.getElementById('cust-main-content');
        el.innerHTML = `<div class="cust-inner"><p class="loading-text"><i class="fa-solid fa-spinner fa-spin"></i></p></div>`;
        try {
            const res   = await fetch(`${this.api}/loans`, { headers: this.getHeaders() });
            let loans = await res.json();
            loans = loans.filter(l => l.Cust_ID === this.userId);
            const filtered = filter === 'ALL' ? loans : loans.filter(l => (l.ApprovalStatus||'PENDING').toUpperCase() === filter);
            el.innerHTML = `<div class="cust-inner">
            <div class="cust-page-header">
                <div><h1 class="cust-greeting">Loan Requests</h1><p class="cust-greet-sub">Manage loan applications</p></div>
                <button class="btn-new-txn" onclick="app.openLoanModal()">+ Apply for Loan</button>
            </div>
            <div class="loan-filter-bar">
                <button class="lf-btn ${filter==='ALL'?'active':''}" onclick="app.renderCustLoans('ALL')">All</button>
                <button class="lf-btn pending ${filter==='PENDING'?'active':''}" onclick="app.renderCustLoans('PENDING')">🕐 Pending</button>
                <button class="lf-btn approved ${filter==='APPROVED'?'active':''}" onclick="app.renderCustLoans('APPROVED')">✅ Approved</button>
                <button class="lf-btn rejected ${filter==='REJECTED'?'active':''}" onclick="app.renderCustLoans('REJECTED')">✖ Rejected</button>
            </div>
            <div class="cust-card">
                <div class="premium-table-wrap">
                <table class="premium-table">
                    <thead><tr><th>LOAN ID</th><th>TYPE</th><th>AMOUNT</th><th>RATE</th><th>TENURE</th><th>STATUS</th><th>DATE</th></tr></thead>
                    <tbody>${!filtered.length
                        ? `<tr><td colspan="7" class="tbl-empty">No ${filter==='ALL'?'':filter.toLowerCase()} loans found.</td></tr>`
                        : filtered.map(l => {
                            const s = (l.ApprovalStatus||'PENDING').toUpperCase();
                            const badgeClass = s==='APPROVED'?'badge-green':s==='REJECTED'?'badge-red':'badge-gold';
                            return `<tr>
                                <td class="tbl-id">LN${String(l.LoanID).padStart(4,'0')}</td>
                                <td>${l.PickupLocation||'Personal'}</td>
                                <td>₹${this.fmt(l.Requested_Amount)}</td>
                                <td>${l.LoanRate||'—'}%</td>
                                <td>${l.TenureMonths||'—'}mo</td>
                                <td><span class="tbl-badge ${badgeClass}">${s}</span></td>
                                <td>${l.CreatedAt?new Date(l.CreatedAt).toLocaleDateString('en-IN'):'—'}</td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
                </div>
            </div></div>`;
        } catch {
            el.innerHTML = `<div class="cust-inner"><p class="error-text">Could not load loans.</p></div>`;
        }
    }

    // ─── MODALS ────────────────────────────────────────────────
    openTransferModal() {
        const m = document.createElement('div');
        m.id = 'nexaModal';
        m.className = 'nexa-modal-overlay';
        m.innerHTML = `
        <div class="nexa-modal">
            <div class="nexa-modal-header">
                <div class="nexa-modal-icon" style="background:rgba(240,192,64,0.12)"><i class="fa-solid fa-bolt" style="color:#f0c040"></i></div>
                <div><div class="nexa-modal-title">Quick Transfer</div><div class="nexa-modal-sub">Instant fund transfer</div></div>
            </div>
            <div class="nexa-modal-field"><label>CUSTOMER ID</label><input id="tf-cust" class="nexa-modal-input" placeholder="e.g. 2001"></div>
            <div class="nexa-modal-field"><label>ACCOUNT NUMBER</label><input id="tf-acct" class="nexa-modal-input" placeholder="e.g. 10001"></div>
            <div class="nexa-modal-field"><label>AMOUNT (₹)</label><input id="tf-amount" class="nexa-modal-input" type="number" placeholder="1000"></div>
            <div class="nexa-modal-field"><label>TRANSFER MODE</label>
                <select id="tf-mode" class="nexa-modal-input">
                    <option>UPI</option><option>NEFT</option><option>RTGS</option><option>IMPS</option>
                </select>
            </div>
            <div id="tf-error" class="nexa-modal-error hidden"></div>
            <div class="nexa-modal-actions">
                <button class="nexa-modal-btn-primary" onclick="app.doTransfer()">Transfer Now →</button>
                <button class="nexa-modal-btn-cancel" onclick="app.closeModal()">Cancel</button>
            </div>
        </div>`;
        document.body.appendChild(m);
    }

    async doTransfer() {
        const custId = document.getElementById('tf-cust').value.trim();
        const acctNo = document.getElementById('tf-acct').value.trim();
        const amount = parseFloat(document.getElementById('tf-amount').value);
        const mode   = document.getElementById('tf-mode').value;
        const errEl  = document.getElementById('tf-error');
        if (!custId || !acctNo || !amount) { errEl.textContent = 'All fields are required.'; errEl.classList.remove('hidden'); return; }
        try {
            const res = await fetch(`${this.api}/transactions`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    CustID: this.userId,
                    Account_No: acctNo,
                    Amount: amount,
                    PayMethod: mode,
                    Description: `${mode} Transfer to Customer ${custId}`,
                    Transaction_Type: 'DEBIT'
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Transfer failed');
            this.closeModal();
            alert('✅ Transfer successful!');
            this.renderCustDashboard();
        } catch(err) { errEl.textContent = err.message; errEl.classList.remove('hidden'); }
    }

    openLoanModal() {
        const m = document.createElement('div');
        m.id = 'nexaModal';
        m.className = 'nexa-modal-overlay';
        m.innerHTML = `
        <div class="nexa-modal">
            <div class="nexa-modal-header">
                <div class="nexa-modal-icon" style="background:rgba(16,185,129,0.12)"><i class="fa-solid fa-hand-holding-dollar" style="color:#10b981"></i></div>
                <div><div class="nexa-modal-title">Apply for Loan</div><div class="nexa-modal-sub">Submit your loan request</div></div>
            </div>
            <div class="nexa-modal-field"><label>LOAN TYPE</label>
                <select id="ln-type" class="nexa-modal-input">
                    <option>HOME</option><option>PERSONAL</option><option>VEHICLE</option><option>EDUCATION</option><option>BUSINESS</option>
                </select>
            </div>
            <div class="nexa-modal-field"><label>LOAN AMOUNT (₹)</label><input id="ln-amount" class="nexa-modal-input" type="number" placeholder="e.g. 500000"></div>
            <div class="nexa-modal-field"><label>TENURE (months)</label><input id="ln-tenure" class="nexa-modal-input" type="number" placeholder="e.g. 36"></div>
            <div class="nexa-modal-field"><label>INTEREST RATE (%)</label><input id="ln-rate" class="nexa-modal-input" type="number" step="0.1" placeholder="e.g. 8.5"></div>
            <div id="ln-error" class="nexa-modal-error hidden"></div>
            <div class="nexa-modal-actions">
                <button class="nexa-modal-btn-primary" onclick="app.doApplyLoan()">Submit Application</button>
                <button class="nexa-modal-btn-cancel" onclick="app.closeModal()">Cancel</button>
            </div>
        </div>`;
        document.body.appendChild(m);
    }

    async doApplyLoan() {
        const type   = document.getElementById('ln-type').value;
        const amount = parseFloat(document.getElementById('ln-amount').value);
        const tenure = parseInt(document.getElementById('ln-tenure').value);
        const rate   = parseFloat(document.getElementById('ln-rate').value);
        const errEl  = document.getElementById('ln-error');
        if (!amount || !tenure || !rate) { errEl.textContent = 'All fields are required.'; errEl.classList.remove('hidden'); return; }
        try {
            const res = await fetch(`${this.api}/loans`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    Cust_ID: this.userId,
                    Requested_Amount: amount,
                    LoanRate: rate,
                    TenureMonths: tenure,
                    PickupDate: new Date().toISOString().split('T')[0],
                    PickupLocation: type
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Application failed');
            this.closeModal();
            alert('✅ Loan application submitted!');
            this.renderCustLoans();
        } catch(err) { errEl.textContent = err.message; errEl.classList.remove('hidden'); }
    }

    async renderCustInvestments() {
        const el = document.getElementById('cust-main-content');
        el.innerHTML = `<div class="cust-inner"><p class="loading-text"><i class="fa-solid fa-spinner fa-spin"></i></p></div>`;
        try {
            const res = await fetch(`${this.api}/investments`, { headers: this.getHeaders() });
            let invs = await res.json();
            invs = invs.filter(i => i.Cust_ID === this.userId);
            el.innerHTML = `<div class="cust-inner">
            <div class="cust-page-header">
                <div><h1 class="cust-greeting">Investments</h1><p class="cust-greet-sub">Grow your wealth</p></div>
                <button class="btn-new-txn" onclick="app.applyInvestment()">+ New Investment</button>
            </div>
            <div class="cust-card">
                <div class="premium-table-wrap">
                <table class="premium-table">
                    <thead><tr><th>ID</th><th>TYPE</th><th>AMOUNT</th><th>DURATION</th><th>STATUS</th><th>DATE</th></tr></thead>
                    <tbody>${!invs.length ? `<tr><td colspan="6" class="tbl-empty">No investments found.</td></tr>` : invs.map(i => `
                            <tr>
                                <td class="tbl-id">INV${String(i.InvestID).padStart(4,'0')}</td>
                                <td>${i.InvestType}</td>
                                <td>₹${this.fmt(i.Amount)}</td>
                                <td>${i.DurationMonths}mo</td>
                                <td><span class="tbl-badge ${i.Status==='ACTIVE'?'badge-green':'badge-gold'}">${i.Status}</span></td>
                                <td>${i.CreatedAt?new Date(i.CreatedAt).toLocaleDateString('en-IN'):'—'}</td>
                            </tr>`).join('')}
                    </tbody>
                </table>
                </div>
            </div></div>`;
        } catch(e) { el.innerHTML = `<p class="error-text">Could not load investments.</p>`; }
    }

    async renderCustCreditCards() {
        const el = document.getElementById('cust-main-content');
        el.innerHTML = `<div class="cust-inner"><p class="loading-text"><i class="fa-solid fa-spinner fa-spin"></i></p></div>`;
        try {
            const res = await fetch(`${this.api}/credit-cards`, { headers: this.getHeaders() });
            let cards = await res.json();
            cards = cards.filter(c => c.Cust_ID === this.userId);
            el.innerHTML = `<div class="cust-inner">
            <div class="cust-page-header">
                <div><h1 class="cust-greeting">Credit Cards</h1><p class="cust-greet-sub">Manage your cards</p></div>
                <button class="btn-new-txn" onclick="app.applyCreditCard()">+ Apply for Card</button>
            </div>
            <div class="cust-card">
                <div class="premium-table-wrap">
                <table class="premium-table">
                    <thead><tr><th>CARD ID</th><th>TYPE</th><th>INCOME</th><th>STATUS</th><th>DATE</th></tr></thead>
                    <tbody>${!cards.length ? `<tr><td colspan="5" class="tbl-empty">No credit card applications found.</td></tr>` : cards.map(c => `
                            <tr>
                                <td class="tbl-id">CC${String(c.CardID).padStart(4,'0')}</td>
                                <td>${c.CardType}</td>
                                <td>₹${this.fmt(c.Income)}</td>
                                <td><span class="tbl-badge ${c.ApprovalStatus==='APPROVED'?'badge-green':c.ApprovalStatus==='REJECTED'?'badge-red':'badge-gold'}">${c.ApprovalStatus}</span></td>
                                <td>${c.CreatedAt?new Date(c.CreatedAt).toLocaleDateString('en-IN'):'—'}</td>
                            </tr>`).join('')}
                    </tbody>
                </table>
                </div>
            </div></div>`;
        } catch(e) { el.innerHTML = `<p class="error-text">Could not load credit cards.</p>`; }
    }

    applyInvestment() {
        const m = document.createElement('div'); m.id = 'nexaModal'; m.className = 'nexa-modal-overlay';
        m.innerHTML = `<div class="nexa-modal"><div class="nexa-modal-header"><div class="nexa-modal-icon" style="background:rgba(16,185,129,0.12)"><i class="fa-solid fa-chart-pie" style="color:#10b981"></i></div><div><div class="nexa-modal-title">New Investment</div></div></div>
            <div class="nexa-modal-field"><label>TYPE</label><select id="inv-type" class="nexa-modal-input"><option>Mutual Fund</option><option>Fixed Deposit</option><option>Gold</option></select></div>
            <div class="nexa-modal-field"><label>AMOUNT (₹)</label><input id="inv-amt" class="nexa-modal-input" type="number"></div>
            <div class="nexa-modal-field"><label>DURATION (MONTHS)</label><input id="inv-dur" class="nexa-modal-input" type="number"></div>
            <div class="nexa-modal-actions"><button class="nexa-modal-btn-primary" onclick="app.doApplyInvestment()">Submit</button><button class="nexa-modal-btn-cancel" onclick="app.closeModal()">Cancel</button></div></div>`;
        document.body.appendChild(m);
    }

    async doApplyInvestment() {
        try {
            await fetch(`${this.api}/investments`, { method: 'POST', headers: this.getHeaders(), body: JSON.stringify({ Cust_ID: this.userId, InvestType: document.getElementById('inv-type').value, Amount: document.getElementById('inv-amt').value, DurationMonths: document.getElementById('inv-dur').value }) });
            this.closeModal(); this.renderCustInvestments();
        } catch(e) { alert('Error: ' + e.message); }
    }

    applyCreditCard() {
        const m = document.createElement('div'); m.id = 'nexaModal'; m.className = 'nexa-modal-overlay';
        m.innerHTML = `<div class="nexa-modal"><div class="nexa-modal-header"><div class="nexa-modal-icon" style="background:rgba(59,130,246,0.12)"><i class="fa-regular fa-credit-card" style="color:#3b82f6"></i></div><div><div class="nexa-modal-title">Apply for Card</div></div></div>
            <div class="nexa-modal-field"><label>CARD TYPE</label><select id="cc-type" class="nexa-modal-input"><option>Platinum Metal</option><option>Gold Rewards</option><option>Travel Plus</option></select></div>
            <div class="nexa-modal-field"><label>ANNUAL INCOME (₹)</label><input id="cc-inc" class="nexa-modal-input" type="number"></div>
            <div class="nexa-modal-actions"><button class="nexa-modal-btn-primary" onclick="app.doApplyCreditCard()">Apply</button><button class="nexa-modal-btn-cancel" onclick="app.closeModal()">Cancel</button></div></div>`;
        document.body.appendChild(m);
    }

    async doApplyCreditCard() {
        try {
            await fetch(`${this.api}/credit-cards`, { method: 'POST', headers: this.getHeaders(), body: JSON.stringify({ Cust_ID: this.userId, CardType: document.getElementById('cc-type').value, Income: document.getElementById('cc-inc').value }) });
            this.closeModal(); this.renderCustCreditCards();
        } catch(e) { alert('Error: ' + e.message); }
    }

    closeModal() {
        const m = document.getElementById('nexaModal');
        if (m) m.remove();
    }

    // ─── EMPLOYEE DASHBOARD ────────────────────────────────────
    loadEmpSection(section) {
        document.querySelectorAll('#emp-sidebar .sidebar-link').forEach(a => a.classList.remove('active'));
        const link = document.getElementById(`esnav-${section}`);
        if (link) link.classList.add('active');

        if (section === 'overview')   this.renderEmpOverview();
        if (section === 'loans')      this.renderEmpLoans();
        if (section === 'creditcards')this.renderEmpCreditCards();
        if (section === 'investments')this.renderEmpInvestments();
        if (section === 'kyc')        this.renderEmpKyc();
        
        if (section === 'customers')  this.renderEmpCustomers();
        if (section === 'accounts')   this.renderEmpAccounts();
        if (section === 'transactions') this.renderEmpTransactions();
        if (section === 'employees')  this.renderEmpEmployees();
        
        if (section === 'reports')    this.renderEmpReports();
        if (section === 'audit')      this.renderEmpAudit();
        if (section === 'profile')    this.renderProfile();
    }

    async renderEmpOverview() {
        const el = document.getElementById('emp-main-content');
        el.innerHTML = `<div class="emp-dash-header">
            <div>
                <h1 class="emp-dash-title">Good Morning, ${this.userName || 'Admin'}${this.userId ? ` | Emp ID: ${this.userId}` : ''} 🏦</h1>
                <p class="emp-dash-sub">Banker & Admin Portal</p>
            </div>
            <div style="display:flex; gap:0.75rem; align-items:center;">
                <button class="theme-icon-btn" onclick="app.cycleTheme()" title="Switch Theme"><i class="fa-solid fa-circle-half-stroke"></i></button>
                <button class="btn-auth-outline"><i class="fa-solid fa-chart-line"></i> Reports</button>
                <button class="btn-auth-submit" onclick="app.loadEmpSection('loans')">Review Loans</button>
            </div>
        </div>

        <div class="emp-stats-grid">
            <div class="emp-stat-box" style="border-top: 4px solid #8b5cf6">
                <div class="emp-stat-box-title">Loans Pending</div>
                <div class="emp-stat-box-value" id="stat-loans">—</div>
                <div class="emp-stat-box-sub" style="color:#d97706"><i class="fa-solid fa-triangle-exclamation"></i> Needs Review</div>
            </div>
            <div class="emp-stat-box" style="border-top: 4px solid #f59e0b">
                <div class="emp-stat-box-title">KYC Pending</div>
                <div class="emp-stat-box-value">3</div>
                <div class="emp-stat-box-sub" style="color:#d97706">Awaiting verification</div>
            </div>
            <div class="emp-stat-box" style="border-top: 4px solid #10b981">
                <div class="emp-stat-box-title">Total Customers</div>
                <div class="emp-stat-box-value" id="stat-cust">—</div>
                <div class="emp-stat-box-sub" style="color:#10b981"><i class="fa-solid fa-arrow-up"></i> +12 this month</div>
            </div>
            <div class="emp-stat-box" style="border-top: 4px solid #3b82f6">
                <div class="emp-stat-box-title">Transactions</div>
                <div class="emp-stat-box-value">5</div>
                <div class="emp-stat-box-sub">₹3.26L processed</div>
            </div>
        </div>

        <div class="emp-grid-2col">
            <div class="emp-panel">
                <div class="emp-panel-title">
                    <span><i class="fa-solid fa-bolt" style="color:#d97706"></i> Pending Loan Approvals</span>
                    <button class="btn-auth-outline" style="padding:4px 10px; font-size:0.8rem" onclick="app.loadEmpSection('loans')">View All</button>
                </div>
                <div id="dash-pending-loans">
                    <p class="loading-text"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</p>
                </div>
            </div>
            <div class="emp-panel">
                <div class="emp-panel-title"><span><i class="fa-solid fa-clock-rotate-left" style="color:#8b5cf6"></i> Recent Activity</span></div>
                <div id="dash-recent-activity">
                    <p class="loading-text"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</p>
                </div>
            </div>
        </div>
        
        <div class="emp-panel">
            <div class="emp-panel-title"><span>Bank Overview</span> <button class="btn-auth-outline" style="padding:4px 10px; font-size:0.8rem">Full Report</button></div>
            <div class="emp-stats-grid" style="margin-bottom:0">
                <div class="emp-stat-box" style="align-items:center; text-align:center; box-shadow:none; background:#f9fafb">
                    <div class="emp-stat-box-value" style="color:#16a34a" id="dash-loans-approved">0</div>
                    <div class="emp-stat-box-title">Loans Approved</div>
                </div>
                <div class="emp-stat-box" style="align-items:center; text-align:center; box-shadow:none; background:#f9fafb">
                    <div class="emp-stat-box-value" style="color:#dc2626" id="dash-loans-rejected">0</div>
                    <div class="emp-stat-box-title">Loans Rejected</div>
                </div>
                <div class="emp-stat-box" style="align-items:center; text-align:center; box-shadow:none; background:#f9fafb">
                    <div class="emp-stat-box-value" style="color:#3b82f6" id="dash-total-deposits">₹0</div>
                    <div class="emp-stat-box-title">Total Deposits</div>
                </div>
            </div>
        </div>`;
        
        fetch(`${this.api}/customers`, { headers: this.getHeaders() })
            .then(r => r.json()).then(d => { const e = document.getElementById('stat-cust'); if(e) e.textContent = d.length; }).catch(()=>{});
            
        fetch(`${this.api}/loans`, { headers: this.getHeaders() })
            .then(r => r.json()).then(d => { 
                const pending = d.filter(l => l.ApprovalStatus === 'PENDING' || !l.ApprovalStatus);
                const approved = d.filter(l => l.ApprovalStatus === 'APPROVED');
                const rejected = d.filter(l => l.ApprovalStatus === 'REJECTED');
                const elPending = document.getElementById('stat-loans');
                if(elPending) elPending.textContent = pending.length;
                
                const elAppr = document.getElementById('dash-loans-approved');
                if(elAppr) elAppr.textContent = approved.length;
                
                const elRej = document.getElementById('dash-loans-rejected');
                if(elRej) elRej.textContent = rejected.length;

                const listEl = document.getElementById('dash-pending-loans');
                if (listEl) {
                    if (pending.length === 0) listEl.innerHTML = '<p style="color:var(--text3); font-size:0.9rem">No pending loans.</p>';
                    else {
                        listEl.innerHTML = pending.slice(0,3).map(l => `
                            <div class="simple-list-item">
                                <div class="sli-info">
                                    <div class="sli-icon" style="color:#d97706; background:#fef3c7"><i class="fa-solid fa-file-signature"></i></div>
                                    <div><div class="sli-title">LN${String(l.LoanID).padStart(4,'0')} - ${l.PickupLocation||'Home Loan'}</div><div class="sli-sub">₹${this.fmt(l.Requested_Amount)} · ${l.TenureMonths||12}mo</div></div>
                                </div>
                                <div class="sli-actions">
                                    <button class="btn-approve" onclick="app.updateApprovalStatus('loan', ${l.LoanID}, 'APPROVED')">✓ Approve</button>
                                    <button class="btn-reject" onclick="app.updateApprovalStatus('loan', ${l.LoanID}, 'REJECTED')">✖ Reject</button>
                                </div>
                            </div>
                        `).join('');
                    }
                }
            }).catch(()=>{});
            
        fetch(`${this.api}/accounts`, { headers: this.getHeaders() })
            .then(r => r.json()).then(d => {
                const total = d.reduce((sum, a) => sum + parseFloat(a.Balance || 0), 0);
                const elDep = document.getElementById('dash-total-deposits');
                if(elDep) elDep.textContent = '₹' + this.fmt(total);
            }).catch(()=>{});

        fetch(`${this.api}/audit`, { headers: this.getHeaders() })
            .then(r => r.json()).then(d => {
                const listEl = document.getElementById('dash-recent-activity');
                if (listEl) {
                    if (d.length === 0) listEl.innerHTML = '<p style="color:var(--text3); font-size:0.9rem">No recent activity.</p>';
                    else {
                        listEl.innerHTML = d.slice(0, 4).map(log => {
                            let icon = '<i class="fa-solid fa-info"></i>';
                            let iconColor = 'var(--text)';
                            let iconBg = 'var(--bg2)';
                            if(log.Event === 'LOGIN') { icon = '<i class="fa-solid fa-user-check"></i>'; iconColor = '#3b82f6'; iconBg = '#dbeafe'; }
                            else if(log.Event === 'ADMIN' && log.LogDetails.includes('APPROVED')) { icon = '<i class="fa-solid fa-check"></i>'; iconColor = '#16a34a'; iconBg = '#dcfce7'; }
                            else if(log.Event === 'ADMIN' && log.LogDetails.includes('REJECTED')) { icon = '<i class="fa-solid fa-xmark"></i>'; iconColor = '#dc2626'; iconBg = '#fee2e2'; }
                            
                            return `<div class="simple-list-item">
                                <div class="sli-info">
                                    <div class="sli-icon" style="color:${iconColor}; background:${iconBg}">${icon}</div>
                                    <div><div class="sli-title">${log.LogDetails}</div><div class="sli-sub">${new Date(log.LogTimestamp).toLocaleString()}</div></div>
                                </div>
                            </div>`;
                        }).join('');
                    }
                }
            }).catch(()=>{});
    }

    async renderEmpCustomers() {
        const el = document.getElementById('emp-main-content');
        el.innerHTML = `<div class="emp-dash-header" style="margin-bottom:0.5rem">
            <div><h2 class="emp-dash-title">Customer Registry</h2><p class="emp-dash-sub">All registered bank customers</p></div>
            <button class="btn-auth-outline theme-icon-btn" onclick="app.cycleTheme()"><i class="fa-solid fa-circle-half-stroke"></i></button>
        </div>
        <div class="registry-toolbar">
            <div class="registry-search"><i class="fa-solid fa-magnifying-glass" style="color:var(--text3)"></i> <input type="text" placeholder="Search..."></div>
            <select class="registry-filter"><option>All Types</option><option>Individual</option><option>Corporate</option></select>
        </div>
        <div id="reg-cust-container"><p class="loading-text"><i class="fa-solid fa-spinner fa-spin"></i></p></div>`;
        try {
            const res = await fetch(`${this.api}/customers`, { headers: this.getHeaders() });
            const custs = await res.json();
            const container = document.getElementById('reg-cust-container');
            if (!custs.length) { container.innerHTML = '<p class="error-text">No customers found.</p>'; return; }
            container.innerHTML = `<div class="registry-table-wrap"><table class="registry-table">
                <thead><tr><th>ID</th><th>Name</th><th>Contact</th><th>PAN</th><th>Type</th><th>KYC</th><th>Actions</th></tr></thead>
                <tbody>${custs.map((c, i) => {
                    const isVip = i%4===0; const isCorp = i%3===0;
                    const type = isCorp ? 'CORPORATE' : isVip ? 'VIP' : 'INDIVIDUAL';
                    const kyc = i%2===0 ? 'VERIFIED' : (i%5===0 ? 'REVIEW' : 'PENDING');
                    return `
                    <tr>
                        <td style="color:var(--text3)">NEX${c.Cust_ID+2000}</td>
                        <td>${c.FName || ''} ${c.LName || ''}</td>
                        <td style="color:var(--text3)">${c.ContactNo || '+91 90001 ' + String(c.Cust_ID).padStart(4,'0')}</td>
                        <td style="color:var(--text3)">${c.TaxID || (c.FName || 'A').substring(0,4).toUpperCase() + 'X' + c.Cust_ID + 'XX'}</td>
                        <td><span class="badge ${isCorp?'badge-gold':isVip?'badge-red':'badge-green'}" style="background:var(--bg3);color:var(--text2)">${type}</span></td>
                        <td><span class="badge ${kyc==='VERIFIED'?'badge-green':kyc==='REVIEW'?'badge-red':'badge-gold'}">${kyc}</span></td>
                        <td><div class="sli-actions"><button class="btn-review" style="padding:0.25rem 0.5rem">View</button><button class="btn-review" style="padding:0.25rem 0.5rem; color:#dc2626; border-color:#fecaca; background:#fef2f2">Del</button></div></td>
                    </tr>`;
                }).join('')}</tbody></table></div>`;
        } catch { document.getElementById('reg-cust-container').innerHTML = `<p class="error-text">Failed to load</p>`; }
    }

    async renderEmpAccounts() {
        const el = document.getElementById('emp-main-content');
        el.innerHTML = `<div class="emp-dash-header" style="margin-bottom:0.5rem">
            <div><h2 class="emp-dash-title">All Accounts</h2><p class="emp-dash-sub">Bank account registry</p></div>
            <button class="btn-auth-outline theme-icon-btn" onclick="app.cycleTheme()"><i class="fa-solid fa-circle-half-stroke"></i></button>
        </div>
        <div class="registry-toolbar">
            <div class="registry-search"><i class="fa-solid fa-magnifying-glass" style="color:var(--text3)"></i> <input type="text" placeholder="Search accounts..."></div>
            <select class="registry-filter"><option>All Statuses</option><option>Active</option></select>
        </div>
        <div id="reg-acct-container"><p class="loading-text"><i class="fa-solid fa-spinner fa-spin"></i></p></div>`;
        try {
            const res = await fetch(`${this.api}/accounts`, { headers: this.getHeaders() });
            const accts = await res.json();
            const container = document.getElementById('reg-acct-container');
            if (!accts.length) { container.innerHTML = '<p class="error-text">No accounts found.</p>'; return; }
            container.innerHTML = `<div class="registry-table-wrap"><table class="registry-table">
                <thead><tr><th>Account No</th><th>Customer ID</th><th>Type</th><th>Balance</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>${accts.map(a => `
                    <tr>
                        <td style="color:var(--text3)">#${a.Account_No}</td>
                        <td style="font-weight:700">NEX${(a.CustID || 0)+2000}</td>
                        <td><span class="badge badge-gold" style="background:var(--bg3);color:var(--text2)">${a.AccountType || 'SAVINGS'}</span></td>
                        <td style="color:var(--gold2); font-size:0.95rem;">₹${this.fmt(a.Balance)}</td>
                        <td><span class="badge badge-green">ACTIVE</span></td>
                        <td><div class="sli-actions"><button class="btn-review" style="padding:0.25rem 0.5rem">View</button></div></td>
                    </tr>`).join('')}</tbody></table></div>`;
        } catch { document.getElementById('reg-acct-container').innerHTML = `<p class="error-text">Failed to load accounts.</p>`; }
    }
    
    async renderEmpTransactions() {
        const el = document.getElementById('emp-main-content');
        el.innerHTML = `<div class="emp-dash-header" style="margin-bottom:0.5rem">
            <div><h2 class="emp-dash-title">All Transactions</h2><p class="emp-dash-sub">Complete bank transaction ledger</p></div>
            <button class="btn-auth-outline theme-icon-btn" onclick="app.cycleTheme()"><i class="fa-solid fa-circle-half-stroke"></i></button>
        </div>
        <div class="registry-toolbar">
            <div class="registry-search"><i class="fa-solid fa-magnifying-glass" style="color:var(--text3)"></i> <input type="text" placeholder="Search..."></div>
            <select class="registry-filter"><option>All Methods</option><option>UPI</option><option>NEFT</option></select>
        </div>
        <div id="reg-txn-container"><p class="loading-text"><i class="fa-solid fa-spinner fa-spin"></i></p></div>`;
        try {
            const res = await fetch(`${this.api}/transactions`, { headers: this.getHeaders() });
            const txns = await res.json();
            const container = document.getElementById('reg-txn-container');
            if (!txns.length) { container.innerHTML = '<p class="error-text">No transactions found.</p>'; return; }
            container.innerHTML = `<div class="registry-table-wrap"><table class="registry-table">
                <thead><tr><th>TXN ID</th><th>From (Sender)</th><th>To (Receiver)</th><th>Amount</th><th>Method</th><th>Date</th><th>Actions</th></tr></thead>
                <tbody>${txns.map(t => `
                    <tr>
                        <td style="color:var(--text3)">#${t.Txn_ID}</td>
                        <td style="font-weight:700">${t.FName || 'System'} ${t.LName || ''}<br><span style="font-size:0.75rem; color:var(--text3); font-weight:normal">Acct: ${t.Account_No || 'N/A'}</span></td>
                        <td>${t.Description ? t.Description : 'Self / External'}</td>
                        <td style="color:${t.Transaction_Type==='CREDIT'?'var(--green)':'var(--text)'}; font-size:0.95rem;">${t.Transaction_Type==='CREDIT'?'+':'-'} ₹${this.fmt(t.Amount)}</td>
                        <td><span class="badge badge-gold" style="background:var(--bg3);color:var(--text2)">${t.PayMethod || 'SYSTEM'}</span></td>
                        <td>${new Date(t.Transaction_Date).toLocaleDateString()}</td>
                        <td><div class="sli-actions"><button class="btn-review" style="padding:0.25rem 0.5rem">View</button></div></td>
                    </tr>`).join('')}</tbody></table></div>`;
        } catch { document.getElementById('reg-txn-container').innerHTML = `<p class="error-text">Failed to load</p>`; }
    }

    async renderEmpReports() {
        const el = document.getElementById('emp-main-content');
        el.innerHTML = `<div class="emp-dash-header" style="margin-bottom:1rem">
            <div><h2 class="emp-dash-title">Reports & Analytics</h2><p class="emp-dash-sub">Bank performance metrics and compliance reports</p></div>
            <div style="display:flex;gap:0.5rem;align-items:center;">
                <button class="btn-auth-outline theme-icon-btn" onclick="app.cycleTheme()"><i class="fa-solid fa-circle-half-stroke"></i></button>
                <button class="btn-auth-outline"><i class="fa-solid fa-download"></i> Export PDF</button>
            </div>
        </div>
        
        <div class="emp-grid-2col">
            <div class="report-card">
                <h3 class="report-card-title">Loan Portfolio Summary</h3>
                <div class="progress-wrap"><div class="progress-lbl"><span>PENDING</span><span style="color:#d97706">2 loans · ₹6.0L</span></div><div class="progress-bar"><div class="progress-fill" style="width:40%; background:#d97706"></div></div></div>
                <div class="progress-wrap"><div class="progress-lbl"><span>APPROVED</span><span style="color:#16a34a">1 loans · ₹20.0L</span></div><div class="progress-bar"><div class="progress-fill" style="width:70%; background:#16a34a"></div></div></div>
                <div class="progress-wrap"><div class="progress-lbl"><span>REJECTED</span><span style="color:#dc2626">1 loans · ₹3.0L</span></div><div class="progress-bar"><div class="progress-fill" style="width:20%; background:#dc2626"></div></div></div>
            </div>
            <div class="report-card">
                <h3 class="report-card-title">Transaction Breakdown</h3>
                <div class="checklist-item" style="border:none; padding:0.5rem 0; background:none"><span class="badge badge-green">UPI</span> <span>₹15,000</span></div>
                <div class="checklist-item" style="border:none; padding:0.5rem 0; background:none"><span class="badge badge-blue" style="background:#dbeafe;color:#2563eb">NEFT</span> <span>₹50,000</span></div>
                <div class="checklist-item" style="border:none; padding:0.5rem 0; background:none"><span class="badge badge-red" style="background:#fee2e2;color:#dc2626">RTGS</span> <span>₹2,50,000</span></div>
            </div>
        </div>
        
        <div class="emp-stats-grid" style="margin-bottom:1.5rem">
            <div class="emp-stat-box" style="padding:1rem 1.5rem"><div class="emp-stat-box-value">₹26.0L</div><div class="emp-stat-box-title">Total Loan Portfolio</div></div>
            <div class="emp-stat-box" style="padding:1rem 1.5rem"><div class="emp-stat-box-value">₹68.2L</div><div class="emp-stat-box-title">Total Deposits</div></div>
            <div class="emp-stat-box" style="padding:1rem 1.5rem"><div class="emp-stat-box-value">0%</div><div class="emp-stat-box-title">NPA Rate</div></div>
        </div>

        <div class="report-card">
            <h3 class="report-card-title">Compliance Checklist</h3>
            <div class="checklist-item"><span style="color:var(--text)"><i class="fa-solid fa-check" style="color:#16a34a; margin-right:0.5rem"></i> RBI Monthly Returns Submitted</span><span style="color:#16a34a">Done</span></div>
            <div class="checklist-item"><span style="color:var(--text)"><i class="fa-solid fa-check" style="color:#16a34a; margin-right:0.5rem"></i> KYC Compliance - 67% Complete</span><span style="color:#4b5563">In Progress</span></div>
            <div class="checklist-item"><span style="color:var(--text)"><i class="fa-solid fa-hourglass-half" style="color:#d97706; margin-right:0.5rem"></i> Quarterly Audit - Due in 14 days</span><span style="color:#d97706">Pending</span></div>
        </div>`;
    }

    async renderEmpAudit() {
        const el = document.getElementById('emp-main-content');
        el.innerHTML = `<div class="emp-dash-header" style="margin-bottom:0.5rem">
            <div><h2 class="emp-dash-title">Audit Log</h2><p class="emp-dash-sub">Complete system event trail</p></div>
            <div style="display:flex;gap:0.5rem;align-items:center;">
                <button class="btn-auth-outline theme-icon-btn" onclick="app.cycleTheme()"><i class="fa-solid fa-circle-half-stroke"></i></button>
                <button class="btn-auth-outline"><i class="fa-solid fa-download"></i> Export</button>
            </div>
        </div>
        <div class="registry-toolbar">
            <div class="registry-search"><i class="fa-solid fa-magnifying-glass" style="color:var(--text3)"></i> <input type="text" placeholder="Search logs..."></div>
            <select class="registry-filter"><option>All Events</option></select>
        </div>
        <div class="registry-table-wrap" id="reg-audit-container"><p class="loading-text"><i class="fa-solid fa-spinner fa-spin"></i></p></div>`;
        try {
            const res = await fetch(`${this.api}/audit`, { headers: this.getHeaders() });
            const logs = await res.json();
            const container = document.getElementById('reg-audit-container');
            if (!logs.length) { container.innerHTML = '<p class="error-text">No audit logs found.</p>'; return; }
            container.innerHTML = `<table class="registry-table">
            <thead><tr><th>Log ID</th><th>Event</th><th>Reference</th><th>Description</th><th>Officer</th><th>Timestamp</th></tr></thead>
            <tbody>${logs.map(log => {
                let badgeClass = 'badge-gold';
                let badgeStyle = 'background:#fef3c7;color:#d97706';
                if(log.Event === 'LOGIN') { badgeClass = 'badge-blue'; badgeStyle = 'background:#dbeafe;color:#2563eb'; }
                else if(log.Event === 'ADMIN') { badgeClass = 'badge-red'; badgeStyle = 'background:#fee2e2;color:#dc2626'; }
                return `<tr>
                    <td style="color:var(--text3)">LOG${log.LogID}</td>
                    <td><span class="badge ${badgeClass}" style="${badgeStyle}">${log.Event || 'SYS'}</span></td>
                    <td>${log.Reference || '—'}</td>
                    <td>${log.LogDetails}</td>
                    <td>${log.Officer || 'SYSTEM'}</td>
                    <td>${new Date(log.LogTimestamp).toLocaleString()}</td>
                </tr>`;
            }).join('')}</tbody></table>`;
        } catch { document.getElementById('reg-audit-container').innerHTML = `<p class="error-text">Failed to load logs</p>`; }
    }

    async renderEmpKyc() { this.renderEmpAudit(); } // Placeholder
    async renderEmpEmployees() { this.renderEmpAudit(); } // Placeholder

    async updateApprovalStatus(type, id, status) {
        if (!confirm(`Are you sure you want to ${status.toLowerCase()} this request?`)) return;
        try {
            let ep = '';
            if (type === 'loan') ep = `loans/${id}/status`;
            if (type === 'cc') ep = `credit-cards/${id}/${status.toLowerCase()}`;
            if (type === 'inv') ep = `investments/${id}/${status.toLowerCase()}`;
            
            const res = await fetch(`${this.api}/${ep}`, {
                method: type === 'loan' ? 'PUT' : 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ status })
            });
            if (!res.ok) throw new Error('Status update failed');
            if (type === 'loan') this.renderEmpLoans();
            if (type === 'cc') this.renderEmpCreditCards();
            if (type === 'inv') this.renderEmpInvestments();
        } catch(e) { alert(e.message); }
    }

    async renderEmpLoans() {
        const el = document.getElementById('emp-main-content');
        el.innerHTML = `<div class="emp-dash-header" style="margin-bottom:1rem">
            <div>
                <h1 class="emp-dash-title">Loan Approval Centre</h1>
                <p class="emp-dash-sub">Review, approve, or reject loan applications</p>
            </div>
            <div style="display:flex; gap:0.5rem; align-items:center;">
                <span class="badge badge-gold">⏳ Pending</span>
                <span class="badge badge-green">✓ Approved</span>
                <span class="badge badge-red">✖ Rejected</span>
                <button class="theme-icon-btn" style="margin-left:1rem" onclick="app.cycleTheme()" title="Switch Theme"><i class="fa-solid fa-circle-half-stroke"></i></button>
            </div>
        </div>
        <div id="loan-cards-container"><p class="loading-text"><i class="fa-solid fa-spinner fa-spin"></i> Loading loans...</p></div>`;
        
        try {
            const res = await fetch(`${this.api}/loans`, { headers: this.getHeaders() });
            let loans = await res.json();
            const container = document.getElementById('loan-cards-container');
            
            if (!loans.length) {
                container.innerHTML = `<p style="text-align:center; padding: 2rem; color: var(--text3)">No loan applications found.</p>`;
                return;
            }

            container.innerHTML = loans.map(l => {
                const s = l.ApprovalStatus || 'PENDING';
                const isPending = s === 'PENDING';
                const isApproved = s === 'APPROVED';
                const isRejected = s === 'REJECTED';
                
                const statusBadge = isApproved ? 'badge-green' : isRejected ? 'badge-red' : 'badge-gold';
                
                let noteHtml = '';
                if (isApproved) noteHtml = `<div class="app-note">Officer Note: Approved based on strong credit history.</div>`;
                if (isRejected) noteHtml = `<div class="app-note red">Officer Note: Rejected due to high risk assessment.</div>`;

                return `
                <div class="approval-card" style="${isApproved ? 'border-left: 4px solid #16a34a;' : isRejected ? 'border-left: 4px solid #dc2626;' : 'border-left: 4px solid #f59e0b;'}">
                    <div class="approval-header">
                        <div>
                            <h3 class="approval-title">LN${String(l.LoanID).padStart(4,'0')} — ${l.CustName || 'Customer'}</h3>
                            <p class="approval-sub">${l.PickupLocation || 'Personal Loan'} · Submitted: ${l.CreatedAt ? new Date(l.CreatedAt).toLocaleDateString() : 'N/A'}</p>
                        </div>
                        <div><span class="badge ${statusBadge}">${s}</span></div>
                    </div>
                    <div class="approval-grid">
                        <div class="app-detail">
                            <span class="app-lbl">Loan Amount</span>
                            <span class="app-val highlight">₹${this.fmt(l.Requested_Amount)}</span>
                        </div>
                        <div class="app-detail">
                            <span class="app-lbl">Interest Rate</span>
                            <span class="app-val">${l.LoanRate || '8.5'}% p.a.</span>
                        </div>
                        <div class="app-detail">
                            <span class="app-lbl">Tenure</span>
                            <span class="app-val">${l.TenureMonths || '36'} months</span>
                        </div>
                    </div>
                    ${noteHtml}
                    <div class="app-actions">
                        ${isPending ? `
                            <button class="btn-approve" onclick="app.updateApprovalStatus('loan', ${l.LoanID}, 'APPROVED')">✓ Approve Loan</button>
                            <button class="btn-reject" onclick="app.updateApprovalStatus('loan', ${l.LoanID}, 'REJECTED')">✖ Reject</button>
                            <button class="btn-review"><i class="fa-solid fa-magnifying-glass"></i> Full Review</button>
                        ` : `
                            <button class="btn-review"><i class="fa-solid fa-magnifying-glass"></i> Full Review</button>
                            <button class="btn-review" onclick="app.updateApprovalStatus('loan', ${l.LoanID}, 'PENDING')"><i class="fa-solid fa-rotate-left"></i> Re-Open</button>
                        `}
                    </div>
                </div>`;
            }).join('');
        } catch(e) {
            document.getElementById('loan-cards-container').innerHTML = `<p class="error-text">Could not load loans.</p>`;
        }
    }

    async renderEmpCreditCards() {
        const el = document.getElementById('emp-main-content');
        el.innerHTML = `<div class="emp-dash-header" style="margin-bottom:1rem">
            <div>
                <h2 class="emp-dash-title">Credit Card Approvals</h2>
            </div>
            <div style="display:flex; gap:0.5rem; align-items:center;">
                <button class="theme-icon-btn" onclick="app.cycleTheme()" title="Switch Theme"><i class="fa-solid fa-circle-half-stroke"></i></button>
            </div>
        </div>
        <p class="loading-text"><i class="fa-solid fa-spinner fa-spin"></i></p>`;
        try {
            const res   = await fetch(`${this.api}/credit-cards`, { headers: this.getHeaders() });
            const cards = await res.json();
            let html = `<h2 class="section-title">Credit Card Approvals</h2><div class="data-wrap"><table>
                <thead><tr><th>Card ID</th><th>Cust ID</th><th>Type</th><th>Income</th><th>Status</th><th>Action</th></tr></thead><tbody>`;
            cards.forEach(c => {
                const s = c.ApprovalStatus || 'PENDING';
                const statusBadge = s === 'APPROVED' ? 'badge-green' : s === 'REJECTED' ? 'badge-red' : 'badge-gold';
                html += `<tr>
                    <td>#${c.CardID}</td>
                    <td>${c.Cust_ID}</td>
                    <td>${c.CardType || '—'}</td>
                    <td>₹${this.fmt(c.Income)}</td>
                    <td><span class="badge ${statusBadge}">${s}</span></td>
                    <td>
                        ${s === 'PENDING' ? `
                            <button class="btn-auth-outline" style="padding:4px 8px; font-size:0.75rem; border-color:#16a34a; color:#16a34a" onclick="app.updateApprovalStatus('cc', ${c.CardID}, 'APPROVED')">Approve</button>
                            <button class="btn-auth-outline" style="padding:4px 8px; font-size:0.75rem; border-color:#dc2626; color:#dc2626; margin-left:4px" onclick="app.updateApprovalStatus('cc', ${c.CardID}, 'REJECTED')">Reject</button>
                        ` : '—'}
                    </td>
                </tr>`;
            });
            html += `</tbody></table></div>`;
            el.innerHTML = html;
        } catch { el.innerHTML = `<h2 class="section-title">Cards</h2><p class="error-text">Could not load cards.</p>`; }
    }

    async renderEmpInvestments() {
        const el = document.getElementById('emp-main-content');
        el.innerHTML = `<div class="emp-dash-header" style="margin-bottom:1rem">
            <div>
                <h2 class="emp-dash-title">Investment Approvals</h2>
            </div>
            <div style="display:flex; gap:0.5rem; align-items:center;">
                <button class="theme-icon-btn" onclick="app.cycleTheme()" title="Switch Theme"><i class="fa-solid fa-circle-half-stroke"></i></button>
            </div>
        </div>
        <p class="loading-text"><i class="fa-solid fa-spinner fa-spin"></i></p>`;
        try {
            const res   = await fetch(`${this.api}/investments`, { headers: this.getHeaders() });
            const invs = await res.json();
            let html = `<h2 class="section-title">Investment Approvals</h2><div class="data-wrap"><table>
                <thead><tr><th>Inv ID</th><th>Type</th><th>Amount</th><th>Duration</th><th>Status</th><th>Action</th></tr></thead><tbody>`;
            invs.forEach(i => {
                const s = i.Status || 'ACTIVE';
                const statusBadge = s === 'ACTIVE' ? 'badge-green' : 'badge-gold';
                html += `<tr>
                    <td>#${i.InvestID}</td>
                    <td>${i.InvestType || '—'}</td>
                    <td>₹${this.fmt(i.Amount)}</td>
                    <td>${i.DurationMonths}mo</td>
                    <td><span class="badge ${statusBadge}">${s}</span></td>
                    <td>
                        ${s === 'ACTIVE' ? `<button class="btn-auth-outline" style="padding:4px 8px; font-size:0.75rem; border-color:#dc2626; color:#dc2626" onclick="app.updateApprovalStatus('inv', ${i.InvestID}, 'REJECT')">Close</button>` : '—'}
                    </td>
                </tr>`;
            });
            html += `</tbody></table></div>`;
            el.innerHTML = html;
        } catch { el.innerHTML = `<h2 class="section-title">Investments</h2><p class="error-text">Could not load investments.</p>`; }
    }

    async renderProfile() {
        const el = document.getElementById(this.userType === 'employee' ? 'emp-main-content' : 'cust-main-content');
        el.innerHTML = `<div class="cust-inner"><div class="cust-page-header" style="margin-bottom:1.5rem"><div><h1 class="cust-greeting">My Profile</h1><p class="cust-greet-sub">Manage your account details</p></div></div><p class="loading-text"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</p></div>`;
        try {
            if (!this.userId) { this.logout(); return; }
            const ep = this.userType==='employee'?'employees':'customers';
            const res = await fetch(`${this.api}/${ep}/${this.userId}`, { headers: this.getHeaders() });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            let accounts = [], txns = [], loans = [];
            try { 
                const [ar, tr, lr] = await Promise.all([
                    fetch(`${this.api}/accounts`, {headers:this.getHeaders()}),
                    fetch(`${this.api}/transactions`, {headers:this.getHeaders()}),
                    fetch(`${this.api}/loans`, {headers:this.getHeaders()})
                ]);
                if(ar.ok) { accounts = await ar.json(); accounts = accounts.filter(a => a.CustID === this.userId); }
                if(tr.ok) { txns = await tr.json(); txns = txns.filter(t => t.CustID === this.userId); }
                if(lr.ok) { loans = await lr.json(); loans = loans.filter(l => l.Cust_ID === this.userId); }
            } catch {}
            
            const acct = accounts[0];
            const init = (data.FName||this.userName||'U').charAt(0).toUpperCase();
            const fullName = `${data.FName||''} ${data.LName||''}`.trim();
            
            // Dynamic Health Score Calculations
            const totalBalance = accounts.reduce((sum, a) => sum + parseFloat(a.Balance || 0), 0);
            
            // CIBIL Score Proxy (650 base + up to 150 from balance + up to 100 from txn activity)
            let cibil = 650 + Math.min(150, Math.floor(totalBalance / 2000)) + Math.min(100, txns.length * 5);
            if (cibil > 900) cibil = 900;
            if (accounts.length === 0 && txns.length === 0 && loans.length === 0) cibil = 0;
            const cibilPct = cibil === 0 ? 0 : Math.round((cibil / 900) * 100);
            const cibilColor = cibil >= 750 ? '#16a34a' : (cibil >= 650 ? '#d4a017' : '#ef4444');
            
            // Loan Utilization (Approved Loans / (Total Balance + Loans))
            const approvedLoans = loans.filter(l => l.ApprovalStatus === 'APPROVED');
            const totalLoanAmt = approvedLoans.reduce((sum, l) => sum + parseFloat(l.Requested_Amount || 0), 0);
            let utilPct = 0;
            if (totalLoanAmt > 0 && totalBalance >= 0) {
                utilPct = Math.round((totalLoanAmt / (totalBalance + totalLoanAmt)) * 100);
            }
            const utilColor = utilPct <= 30 ? '#16a34a' : (utilPct <= 70 ? '#d4a017' : '#ef4444');
            
            // On-Time Payments Proxy (drops by 5% for every rejected loan)
            const rejectedLoans = loans.filter(l => l.ApprovalStatus === 'REJECTED').length;
            let onTimePct = Math.max(0, 100 - (rejectedLoans * 5));
            if (txns.length === 0 && loans.length === 0) onTimePct = 100; // Default to perfect if no history
            const onTimeColor = onTimePct >= 90 ? '#3b82f6' : (onTimePct >= 70 ? '#d4a017' : '#ef4444');

            el.innerHTML = `<div class="cust-inner">
            <div class="cust-page-header" style="margin-bottom:1.5rem"><div><h1 class="cust-greeting">My Profile</h1><p class="cust-greet-sub">Manage your account details</p></div></div>
            <div class="profile-two-col">
                <div class="profile-info-card">
                    <div class="profile-top">
                        <div class="profile-big-avatar">${init}</div>
                        <div><div class="profile-big-name">${fullName}</div><div class="profile-big-sub">${data.Email||''}</div><span class="profile-kyc">✓ KYC Verified</span></div>
                    </div>
                    <div class="profile-fields">
                        <div class="profile-field"><label>FULL NAME</label><input class="profile-input" value="${fullName}" id="pf-name" readonly></div>
                        <div class="profile-field"><label>EMAIL</label><input class="profile-input" value="${data.Email||''}" id="pf-email" readonly></div>
                        <div class="profile-field"><label>MOBILE</label><input class="profile-input" value="${data.ContactNo||''}" id="pf-mobile" readonly></div>
                        <div class="profile-field"><label>ADDRESS</label><input class="profile-input" value="${data.Address||''}" id="pf-address" readonly></div>
                    </div>
                    ${this.userType==='customer'?`
                    <div style="margin-top:1.5rem;padding-top:1.5rem;border-top:1px solid var(--border)">
                        <h4 style="color:#ef4444;margin-bottom:0.5rem;font-size:0.9rem"><i class="fa-solid fa-triangle-exclamation"></i> Danger Zone</h4>
                        <p style="color:var(--text3);font-size:0.82rem;margin-bottom:0.75rem">This will permanently delete your account and all data.</p>
                        <button onclick="app.deleteAccount()" class="btn-delete-acct"><i class="fa-solid fa-trash"></i> Delete My Account</button>
                    </div>`:''}
                </div>
                <div class="profile-right-col">
                    ${acct?`
                    <div class="bank-card">
                        <div class="bank-card-bg1"></div><div class="bank-card-bg2"></div>
                        <div class="bank-card-bank">NEXABANK · ${acct.AccountType||'SAVINGS'} ACCOUNT</div>
                        <div class="bank-card-bal-lbl">Available Balance</div>
                        <div class="bank-card-bal">₹${this.fmt(acct.Balance)}</div>
                        <div class="bank-card-bottom">
                            <div><div class="bank-card-num-lbl">ACCOUNT NUMBER</div><div class="bank-card-num">•••• •••• ${String(acct.Account_No).slice(-4)}</div></div>
                            <div class="bank-card-chip"></div>
                        </div>
                    </div>`:'<div class="cust-card" style="text-align:center;color:var(--text3);padding:3rem">No accounts found.</div>'}
                    <div class="health-card">
                        <div class="health-card-title">Account Health Score</div>
                        <div class="health-row"><span class="health-lbl">CIBIL Score</span><span class="health-val" style="color:${cibilColor}">${cibil === 0 ? 'N/A' : cibil+'/900'}</span></div>
                        <div class="health-bar-bg"><div class="health-bar-fill" style="width:${cibilPct}%;background:${cibilColor}"></div></div>
                        <div class="health-row"><span class="health-lbl">Loan Utilization</span><span class="health-val" style="color:${utilColor}">${utilPct}%</span></div>
                        <div class="health-bar-bg"><div class="health-bar-fill" style="width:${utilPct}%;background:${utilColor}"></div></div>
                        <div class="health-row"><span class="health-lbl">On-Time Payments</span><span class="health-val" style="color:${onTimeColor}">${onTimePct}%</span></div>
                        <div class="health-bar-bg"><div class="health-bar-fill" style="width:${onTimePct}%;background:${onTimeColor}"></div></div>
                    </div>
                </div>
            </div></div>`;
        } catch(err) { el.innerHTML = `<div class="cust-inner"><p class="error-text">Could not load profile: ${err.message}</p></div>`; }
    }

    async deleteAccount() {
        if (!confirm('⚠️ Are you absolutely sure? This will permanently delete your account and cannot be undone!')) return;
        try {
            const res = await fetch(`${this.api}/customers/${this.userId}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Deletion failed.');
            alert('Your account has been permanently deleted.');
            this.logout();
        } catch (err) {
            alert('Could not delete account: ' + err.message);
        }
    }
}

const app = new NexaBank();
