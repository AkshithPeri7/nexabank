class NexaBank {
    constructor() {
        this.api = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? 'http://localhost:5000/api'
            : 'https://nexabank-production.up.railway.app/api';
        this.token = localStorage.getItem('nx_token');
        this.userType = localStorage.getItem('nx_type');
        this.userName = localStorage.getItem('nx_name');
        this.userId = localStorage.getItem('nx_id') ? Number(localStorage.getItem('nx_id')) : null;
        this.theme = localStorage.getItem('nx_theme') || 'dark';
        this.selectedAccountType = 'SAVINGS';
        this.currentStep = 1;
        this.init();
    }

    
    toast(message, type = 'info') {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }
        
        const toast = document.createElement('div');
        toast.className = 'nx-toast ' + type;
        
        const icons = { success: 'fa-check-circle', error: 'fa-triangle-exclamation', info: 'fa-info-circle' };
        const icon = icons[type] || icons.info;
        
        toast.innerHTML = `<i class="fa-solid ${icon} nx-toast-icon"></i>
            <div style="flex:1">${message}</div>
            <button class="nx-toast-close" onclick="this.parentElement.remove()"><i class="fa-solid fa-xmark"></i></button>`;
            
        container.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentElement) {
                toast.style.animation = 'toastSlideOut 0.3s ease-in forwards';
                setTimeout(() => toast.remove(), 300);
            }
        }, 4000);
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
            const cidText = this.userId ? ` (ID: ${this.userId})` : '';
            document.getElementById('dash-user-name').textContent = name;
            document.getElementById('cust-topbar-name').textContent = name + cidText;
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
            this.userId   = data.user?.id ? Number(data.user.id) : null;
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
            this.userId   = data.user?.id ? Number(data.user.id) : null;
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
                    this.toast('Please fill in all personal details.', 'error'); return;
                }
            }
        }
        if (step === 3) {
            const deposit = document.getElementById('reg-deposit').value;
            if (!deposit || parseFloat(deposit) < 500) {
                this.toast('Minimum deposit is ₹500.', 'error'); return;
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
            this.toast('Supabase is not initialized. Please configure it in index.html first!', 'error');
            return;
        }
        try {
            // Always redirect to the production site, unless running locally
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const redirectTo = isLocal
                ? window.location.origin + window.location.pathname
                : 'https://nexabanke.netlify.app/';

            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo }
            });
            if (error) throw error;
        } catch (err) {
            this.toast('Google login failed: ' + err.message, 'error');
        }
    }

    async handleSupabaseRedirect() {
        if (!window.supabase) return;
        
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) console.error('Supabase session error:', error);
        
        if (session && session.user) {
            const email = session.user.email;
            const fName = session.user.user_metadata?.first_name || session.user.user_metadata?.full_name?.split(' ')[0] || 'User';
            const lName = session.user.user_metadata?.last_name || session.user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '';

            try {
                // First, do a quick check — call backend without extra fields to detect new vs existing
                const res = await fetch(`${this.api}/auth/google`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, fName, lName })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Backend sync failed');

                // Store auth state
                this._pendingGoogleAuth = { token: data.token, user: data.user };

                // Clear supabase session early
                window.history.replaceState({}, document.title, window.location.pathname);
                await supabase.auth.signOut();

                if (data.isNewUser) {
                    // New user — show onboarding modal to collect extra details
                    this._showGoogleOnboardingModal(fName, data);
                } else {
                    // Returning user — go straight to dashboard
                    this._completeGoogleLogin(data);
                }
            } catch (err) {
                this.toast('Google Authentication Error: ' + err.message, 'error');
            }
        }
    }

    _showGoogleOnboardingModal(fName, data) {
        // Remove existing modal if any
        const old = document.getElementById('googleOnboardModal');
        if (old) old.remove();

        const overlay = document.createElement('div');
        overlay.id = 'googleOnboardModal';
        overlay.style.cssText = `
            position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:9999;
            display:flex; align-items:center; justify-content:center; padding:1rem;
            backdrop-filter:blur(4px);
        `;
        overlay.innerHTML = `
            <div style="background:var(--card); border:1px solid var(--border); border-radius:20px;
                        padding:2rem; width:100%; max-width:420px; animation:authFadeIn 0.3s ease-out;">
                <div style="text-align:center; margin-bottom:1.5rem;">
                    <div style="width:56px;height:56px;background:rgba(240,192,64,0.12);border-radius:50%;
                                display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;">
                        <i class="fa-solid fa-user-check" style="font-size:1.4rem;color:var(--gold2);"></i>
                    </div>
                    <h3 style="font-size:1.3rem;font-weight:800;color:var(--text);margin-bottom:0.3rem;">
                        Almost done, ${fName}! 🎉
                    </h3>
                    <p style="color:var(--text3);font-size:0.88rem;">
                        Complete your NexaBank account setup — takes 10 seconds.
                    </p>
                </div>

                <div style="margin-bottom:1rem;">
                    <label style="font-size:0.72rem;font-weight:700;letter-spacing:1.5px;color:var(--text3);text-transform:uppercase;display:block;margin-bottom:0.4rem;">
                        PHONE NUMBER
                    </label>
                    <div style="display:flex;align-items:center;background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:0 0.85rem;">
                        <i class="fa-solid fa-phone" style="color:var(--text3);margin-right:0.6rem;font-size:0.9rem;"></i>
                        <input id="gob-phone" type="tel" placeholder="+91 98765 43210"
                            style="flex:1;background:transparent;border:none;outline:none;padding:0.75rem 0;
                                   color:var(--text);font-size:0.95rem;font-family:'Inter',sans-serif;">
                    </div>
                </div>

                <div style="margin-bottom:1.5rem;">
                    <label style="font-size:0.72rem;font-weight:700;letter-spacing:1.5px;color:var(--text3);text-transform:uppercase;display:block;margin-bottom:0.4rem;">
                        INITIAL DEPOSIT (₹)
                    </label>
                    <div style="display:flex;align-items:center;background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:0 0.85rem;">
                        <i class="fa-solid fa-indian-rupee-sign" style="color:var(--text3);margin-right:0.6rem;font-size:0.9rem;"></i>
                        <input id="gob-deposit" type="number" min="500" placeholder="Minimum ₹500"
                            style="flex:1;background:transparent;border:none;outline:none;padding:0.75rem 0;
                                   color:var(--text);font-size:0.95rem;font-family:'Inter',sans-serif;">
                    </div>
                    <p style="font-size:0.75rem;color:var(--text3);margin-top:0.3rem;">
                        <i class="fa-solid fa-circle-info"></i> Minimum opening balance is ₹500
                    </p>
                </div>

                <div id="gob-error" style="display:none;color:#ef4444;font-size:0.83rem;font-weight:600;margin-bottom:0.75rem;"></div>

                <button onclick="app._submitGoogleOnboarding()" id="gob-submit-btn"
                    style="width:100%;padding:0.85rem;background:var(--gold2);color:#000;border:none;
                           border-radius:8px;font-size:1rem;font-weight:700;cursor:pointer;
                           display:flex;align-items:center;justify-content:center;gap:0.6rem;
                           transition:all 0.2s;font-family:'Inter',sans-serif;">
                    <i class="fa-solid fa-bank"></i> Open My Account
                </button>
            </div>
        `;
        document.body.appendChild(overlay);
        document.getElementById('gob-phone').focus();
    }

    async _submitGoogleOnboarding() {
        const phone = document.getElementById('gob-phone')?.value.trim();
        const deposit = parseFloat(document.getElementById('gob-deposit')?.value);
        const errEl = document.getElementById('gob-error');
        const btn = document.getElementById('gob-submit-btn');

        // Validate
        if (!phone) { errEl.style.display='block'; errEl.textContent='Please enter your phone number.'; return; }
        if (!deposit || deposit < 500) { errEl.style.display='block'; errEl.textContent='Minimum initial deposit is ₹500.'; return; }
        errEl.style.display = 'none';

        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Setting up your account...';
        btn.disabled = true;

        try {
            // Update contact number on the newly created account
            const pendingData = this._pendingGoogleAuth;
            await fetch(`${this.api}/customers/${pendingData.user.id}/contact`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${pendingData.token}` },
                body: JSON.stringify({ contactNo: phone, initialDeposit: deposit })
            });

            // Close modal and go to dashboard
            const modal = document.getElementById('googleOnboardModal');
            if (modal) modal.remove();
            this._completeGoogleLogin(pendingData);
        } catch (err) {
            btn.innerHTML = '<i class="fa-solid fa-bank"></i> Open My Account';
            btn.disabled = false;
            errEl.style.display = 'block';
            errEl.textContent = 'Error saving details. Proceeding to dashboard anyway.';
            setTimeout(() => {
                const modal = document.getElementById('googleOnboardModal');
                if (modal) modal.remove();
                this._completeGoogleLogin(this._pendingGoogleAuth);
            }, 2000);
        }
    }

    _completeGoogleLogin(data) {
        const uid = Number(data.user.id);
        localStorage.setItem('nx_token', data.token);
        localStorage.setItem('nx_type', 'customer');
        localStorage.setItem('nx_name', data.user.fName);
        localStorage.setItem('nx_id', uid);
        this.token = data.token;
        this.userType = 'customer';
        this.userName = data.user.fName;
        this.userId = uid;
        this.showPage('customer-dash');
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
        if (section === 'payees')       this.renderCustPayees();
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
                <button class="qa-btn" onclick="app.loadCustSection('transactions')"><div class="qa-icon"><i class="fa-solid fa-paper-plane"></i></div>Fund Transfer</button>
                <button class="qa-btn" onclick="app.loadCustSection('loans')"><div class="qa-icon"><i class="fa-solid fa-file-contract"></i></div>Apply Loan</button>
                <button class="qa-btn" onclick="app.loadCustSection('accounts')"><div class="qa-icon"><i class="fa-solid fa-building-columns"></i></div>My Accounts</button>
                <button class="qa-btn" onclick="app.loadCustSection('profile')"><div class="qa-icon"><i class="fa-solid fa-user"></i></div>My Profile</button>
                <button class="qa-btn" onclick="app.loadCustSection('transactions')"><div class="qa-icon"><i class="fa-solid fa-receipt"></i></div>Statement</button>
                <button class="qa-btn" onclick="app.showPage('open-account')"><div class="qa-icon"><i class="fa-solid fa-plus"></i></div>Open Account</button>
                <button class="qa-btn" onclick="app.loadCustSection('loans')"><div class="qa-icon"><i class="fa-solid fa-rotate"></i></div>Loan Status</button>
                <button class="qa-btn" onclick="app.loadCustSection('transactions')"><div class="qa-icon"><i class="fa-solid fa-magnifying-glass"></i></div>Audit Log</button>
            </div>
        </div>
        <div class="cust-two-col">
            <div class="cust-card"><div class="cust-card-header"><span class="cust-card-title">Recent Transactions</span><button class="cust-view-all" onclick="app.loadCustSection('transactions')">View All</button></div><div id="d-txns"><p class="loading-text"><i class="fa-solid fa-spinner fa-spin"></i></p></div></div>
            <div class="cust-card"><div class="cust-card-header"><span class="cust-card-title">My Accounts</span><button class="cust-view-all" onclick="app.loadCustSection('accounts')">Manage</button></div><div id="d-accts"><p class="loading-text"><i class="fa-solid fa-spinner fa-spin"></i></p></div></div>
        </div>
        <div class="cust-card" style="margin-top: 1.5rem; background: var(--bg2); border: 1px dashed var(--gold);">
            <div class="cust-card-header"><span class="cust-card-title" style="color:var(--gold2)"><i class="fa-solid fa-bolt"></i> Quick Pay (Simulated Gateway)</span><button class="cust-view-all" onclick="app.openBillPayModal()">Pay Any Bill</button></div>
            <div class="qa-grid" style="margin-top:0.5rem">
                <button class="qa-btn" onclick="document.getElementById('bp-category') && (document.getElementById('bp-category').value='Electricity Bill'); app.openBillPayModal()"><div class="qa-icon"><i class="fa-solid fa-lightbulb" style="color:#eab308"></i></div>Electricity</button>
                <button class="qa-btn" onclick="document.getElementById('bp-category') && (document.getElementById('bp-category').value='Mobile Recharge'); app.openBillPayModal()"><div class="qa-icon"><i class="fa-solid fa-mobile-screen" style="color:#3b82f6"></i></div>Mobile Recharge</button>
                <button class="qa-btn" onclick="document.getElementById('bp-category') && (document.getElementById('bp-category').value='Credit Card Bill'); app.openBillPayModal()"><div class="qa-icon"><i class="fa-solid fa-credit-card" style="color:#ef4444"></i></div>Credit Card</button>
                <button class="qa-btn" onclick="document.getElementById('bp-category') && (document.getElementById('bp-category').value='Broadband Bill'); app.openBillPayModal()"><div class="qa-icon"><i class="fa-solid fa-wifi" style="color:#10b981"></i></div>Broadband</button>
            </div>
        </div>
        <div class="cust-card" style="margin-top: 1.5rem;">
            <div class="cust-card-header"><span class="cust-card-title">Spending Analytics (All Time)</span></div>
            <div style="height: 300px; display: flex; justify-content: center; align-items: center; padding: 1rem; width: 100%;">
                <canvas id="spendChart"></canvas>
            </div>
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
            }

            // Render Spending Analytics Chart
            const currMonth = new Date().getMonth();
            const currYear = new Date().getFullYear();
            const debits = txns.filter(t => {
                if (t.Transaction_Type !== 'DEBIT') return false;
                if (!t.Transaction_Date) return false;
                const d = new Date(t.Transaction_Date);
                return d.getMonth() === currMonth && d.getFullYear() === currYear;
            });
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
                if (window.spendChartInstance) window.spendChartInstance.destroy();
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
            }
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

    
    async exportCustomerStatement(format = 'csv') {
        if (!this.userId) return;
        try {
            const res = await fetch(`${this.api}/transactions`, { headers: this.getHeaders() });
            const allTxns = await res.json();
            const txns = allTxns.filter(t => t.CustID === this.userId);
            if (!txns.length) {
                this.toast('No transactions to export.', 'info');
                return;
            }
            
            if (format === 'pdf' && window.jspdf) {
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();
                
                doc.setFontSize(18);
                doc.text("NexaBank - Account Statement", 14, 22);
                doc.setFontSize(11);
                doc.text(`Customer ID: ${this.userId}`, 14, 30);
                doc.text(`Generated On: ${new Date().toLocaleDateString('en-IN')}`, 14, 36);
                
                const tableData = txns.map(t => [
                    t.Txn_ID,
                    t.Transaction_Date ? new Date(t.Transaction_Date).toLocaleDateString('en-IN') : '',
                    t.Description || 'Transfer',
                    t.Transaction_Type,
                    t.Amount
                ]);
                
                doc.autoTable({
                    startY: 45,
                    head: [['Txn ID', 'Date', 'Description', 'Type', 'Amount (Rs)']],
                    body: tableData,
                    theme: 'striped',
                    headStyles: { fillColor: [217, 160, 91] }
                });
                
                doc.save(`account_statement_${new Date().toISOString().split('T')[0]}.pdf`);
                this.toast('Statement downloaded successfully as PDF.', 'success');
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
            const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(r => r.join(',')).join('\n');
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement('a');
            link.setAttribute('href', encodedUri);
            link.setAttribute('download', 'account_statement_' + new Date().toISOString().split('T')[0] + '.csv');
            document.body.appendChild(link);
            link.click();
            link.remove();
            this.toast('Statement downloaded successfully as CSV.', 'success');
        } catch (e) {
            console.error(e);
            this.toast('Failed to download statement.', 'error');
        }
    }


    async renderCustPayees() {
        const el = document.getElementById('cust-main-content');
        el.innerHTML = `<div class="cust-inner"><p class="loading-text"><i class="fa-solid fa-spinner fa-spin"></i> Loading Payees...</p></div>`;
        try {
            const res = await fetch(`${this.api}/beneficiaries/${this.userId}`, { headers: this.getHeaders() });
            const payees = await res.json();
            
            el.innerHTML = `<div class="cust-inner">
                <div class="cust-page-header">
                    <div><h1 class="cust-greeting">Beneficiaries</h1><p class="cust-greet-sub">Manage your saved payees for quick transfers</p></div>
                    <button class="btn-new-txn" onclick="app.showAddPayeeModal()">+ Add Payee</button>
                </div>
                <div class="cust-card">
                    <div class="cust-card-header"><span class="cust-card-title">Saved Payees</span></div>
                    <div class="premium-table-wrap">
                        <table class="premium-table">
                            <thead><tr><th>PAYEE NAME</th><th>ACCOUNT NUMBER</th><th>ACTIONS</th></tr></thead>
                            <tbody>${!payees.length
                                ? `<tr><td colspan="3" class="tbl-empty">No saved payees found.</td></tr>`
                                : payees.map(p => `<tr>
                                    <td>${p.Ben_Name}</td>
                                    <td>${p.Ben_Account_No}</td>
                                    <td><button class="btn-auth-outline" style="border-color:var(--red); color:var(--red); padding: 0.25rem 0.75rem;" onclick="app.deletePayee(${p.Ben_ID})">Delete</button></td>
                                </tr>`).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>`;
        } catch(e) {
            el.innerHTML = `<p style="color:var(--red)">Failed to load payees: ${e.message}</p>`;
        }
    }

    showAddPayeeModal() {
        const old = document.getElementById('addPayeeModal'); if(old) old.remove();
        const ov = document.createElement('div');
        ov.className = 'nexa-modal-overlay active';
        ov.id = 'addPayeeModal';
        ov.innerHTML = `
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
            </div>`;
        document.body.appendChild(ov);
    }

    async addPayee() {
        const name = document.getElementById('payee-name').value;
        const acc = document.getElementById('payee-acc').value;
        try {
            const res = await fetch(`${this.api}/beneficiaries/${this.userId}`, {
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
            const res = await fetch(`${this.api}/beneficiaries/${benId}`, {
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
                <div style="display:flex;gap:0.5rem;"><button class="btn-new-txn" onclick="app.exportCustomerStatement('pdf')"><i class="fa-solid fa-file-pdf"></i> PDF</button><button class="btn-new-txn" onclick="app.exportCustomerStatement('csv')"><i class="fa-solid fa-file-csv"></i> CSV</button><button class="btn-new-txn" onclick="app.openBillPayModal()"><i class="fa-solid fa-file-invoice-dollar"></i> Pay Bills</button><button class="btn-new-txn" onclick="app.openTransferModal()">+ Fund Transfer</button></div>
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
                     <thead><tr><th>LOAN ID</th><th>TYPE</th><th>AMOUNT</th><th>RATE</th><th>TENURE</th><th>STATUS</th><th>DATE</th><th>EMI</th></tr></thead>
                     <tbody>${!filtered.length
                         ? `<tr><td colspan="8" class="tbl-empty">No ${filter==='ALL'?'':filter.toLowerCase()} loans found.</td></tr>`
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
                                 <td>${s==='APPROVED'?`<button class="btn-auth-outline" style="padding:0.25rem 0.6rem;font-size:0.8rem" onclick="app.viewEMISchedule(${l.LoanID})">EMI Schedule</button>`:'—'}</td>
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

    async viewEMISchedule(loanId) {
        try {
            const res = await fetch(`${this.api}/loans/${loanId}/emis`, { headers: this.getHeaders() });
            const emis = await res.json();
            const old = document.getElementById('emiModal'); if(old) old.remove();
            const ov = document.createElement('div');
            ov.className = 'nexa-modal-overlay active';
            ov.id = 'emiModal';
            ov.innerHTML = `
                <div class="nexa-modal" style="max-width:700px">
                    <div class="nexa-modal-header">
                        <div class="nexa-modal-icon" style="background:rgba(59,130,246,0.12)"><i class="fa-solid fa-calendar-days" style="color:#3b82f6"></i></div>
                        <div><div class="nexa-modal-title">EMI Schedule — LN${String(loanId).padStart(4,'0')}</div><div class="nexa-modal-sub">${emis.length} installments</div></div>
                        <button class="nexa-modal-close" onclick="this.closest('.nexa-modal-overlay').remove()"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <div class="premium-table-wrap" style="max-height:400px;overflow-y:auto;margin-top:1rem">
                    <table class="premium-table">
                        <thead><tr><th>#</th><th>DUE DATE</th><th>EMI AMOUNT</th><th>PRINCIPAL</th><th>INTEREST</th><th>STATUS</th></tr></thead>
                        <tbody>${!emis.length
                            ? '<tr><td colspan="6" class="tbl-empty">No EMI schedule generated yet.</td></tr>'
                            : emis.map((e,i) => `<tr>
                                <td style="color:var(--text2)">${i+1}</td>
                                <td>${new Date(e.DueDate).toLocaleDateString('en-IN')}</td>
                                <td><strong>₹${this.fmt(e.EMIAmount)}</strong></td>
                                <td style="color:var(--blue)">₹${this.fmt(e.PrincipalComponent)}</td>
                                <td style="color:var(--red)">₹${this.fmt(e.InterestComponent)}</td>
                                <td><span class="tbl-badge ${e.Status==='PAID'?'badge-green':e.Status==='OVERDUE'?'badge-red':'badge-gold'}">${e.Status}</span></td>
                            </tr>`).join('')}
                        </tbody>
                    </table>
                    </div>
                    <button class="btn-auth-submit" style="width:100%;margin-top:1rem" onclick="this.closest('.nexa-modal-overlay').remove()">Close</button>
                </div>`;
            document.body.appendChild(ov);
        } catch(e) {
            this.toast('Failed to load EMI schedule.', 'error');
        }
    }

    // ─── MODALS ────────────────────────────────────────────────

    openBillPayModal() {
        const m = document.createElement('div');
        m.id = 'nexaModal';
        m.className = 'nexa-modal-overlay';
        m.innerHTML = `
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
        </div>`;
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
            const acR = await fetch(`${this.api}/accounts`, { headers: this.getHeaders() });
            const accounts = await acR.json();
            const myAcc = accounts.find(a => a.CustID === this.userId);
            if (!myAcc) throw new Error('No active account found to debit.');

            const res = await fetch(`${this.api}/transactions`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    Account_No: myAcc.Account_No,
                    CustID: this.userId,
                    Amount: amt,
                    Transaction_Type: 'DEBIT',
                    Description: `${cat} - ${acc}`,
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

    async openTransferModal() {

        let payeeOptions = '<option value="">-- Choose Payee --</option>';
        try {
            if(this.userId) {
                const res = await fetch(`${this.api}/beneficiaries/${this.userId}`, { headers: this.getHeaders() });
                const payees = await res.json();
                if(payees.length) {
                    payeeOptions += payees.map(p => `<option value="${p.Ben_Account_No}">${p.Ben_Name} - ${p.Ben_Account_No}</option>`).join('');
                }
            }
        } catch(e) {}

        const m = document.createElement('div');
        m.id = 'nexaModal';
        m.className = 'nexa-modal-overlay';
        m.innerHTML = `
        <div class="nexa-modal">
            <div class="nexa-modal-header">
                <div class="nexa-modal-icon" style="background:rgba(240,192,64,0.12)"><i class="fa-solid fa-bolt" style="color:#f0c040"></i></div>
                <div><div class="nexa-modal-title">Quick Transfer</div><div class="nexa-modal-sub">Instant fund transfer</div></div>
            </div>
            <div class="nexa-modal-field"><label>SAVED PAYEE</label>
                <select class="nexa-modal-input" onchange="if(this.value) document.getElementById('tf-acct').value = this.value;">
                    ${payeeOptions}
                </select>
            </div>
            <div class="nexa-modal-field"><label>CUSTOMER ID <span style="text-transform:none;color:#9ca3af;font-weight:normal">(Optional)</span></label><input id="tf-cust" class="nexa-modal-input" placeholder="e.g. 2001"></div>
            <div class="nexa-modal-field"><label>ACCOUNT NUMBER</label><input id="tf-acct" class="nexa-modal-input" placeholder="e.g. 1000000001"></div>
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
        if (!acctNo || !amount) { errEl.textContent = 'Account Number and Amount are required.'; errEl.classList.remove('hidden'); return; }
        try {
            const res = await fetch(`${this.api}/transactions/transfer`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    SenderCustID: this.userId,
                    ReceiverCustID: custId,
                    ReceiverAccountNo: acctNo,
                    Amount: amount,
                    PayMethod: mode
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Transfer failed');
            this.closeModal();
            this.toast('Transfer successful!', 'success');
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
            this.toast('Loan application submitted!', 'success');
            this.renderCustLoans();
        } catch(err) { errEl.textContent = err.message; errEl.classList.remove('hidden'); }
    }


    async renderCustInvestments() {
        const el = document.getElementById('cust-main-content');
        el.innerHTML = `<div class="cust-inner"><p class="loading-text"><i class="fa-solid fa-spinner fa-spin"></i></p></div>`;
        try {
            const [resInv, resFD, resRD] = await Promise.all([
                fetch(`${this.api}/investments`, { headers: this.getHeaders() }),
                fetch(`${this.api}/fixed-deposits/${this.userId}`, { headers: this.getHeaders() }),
                fetch(`${this.api}/recurring-deposits/${this.userId}`, { headers: this.getHeaders() }).catch(() => ({ ok: false }))
            ]);
            let invs = await resInv.json();
            invs = invs.filter(i => i.Cust_ID === this.userId);
            
            let fds = [];
            if(resFD.ok) fds = await resFD.json();

            let rds = [];
            if(resRD && resRD.ok) rds = await resRD.json();

            el.innerHTML = `<div class="cust-inner">
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
                    <tbody>${!fds.length ? `<tr><td colspan="7" class="tbl-empty">No active Fixed Deposits found.</td></tr>` : fds.map(f => `
                            <tr>
                                <td class="tbl-id">FD${String(f.FD_ID).padStart(4,'0')}</td>
                                <td>₹${this.fmt(f.Principal)}</td>
                                <td>${f.InterestRate}%</td>
                                <td>${f.TenureMonths} Months</td>
                                <td>${f.MaturityDate?new Date(f.MaturityDate).toLocaleDateString('en-IN'):'—'}</td>
                                <td style="color:var(--green)">₹${this.fmt(f.MaturityAmount)}</td>
                                <td><span class="tbl-badge ${f.Status==='ACTIVE'?'badge-green':'badge-gold'}">${f.Status}</span></td>
                            </tr>`).join('')}
                    </tbody>
                </table>
                </div>
            </div>

            <!-- RECURRING DEPOSITS TABLE -->
            <div class="cust-card" style="margin-bottom:1.5rem">
                <div class="cust-card-header">
                    <span class="cust-card-title">Recurring Deposits (RDs)</span>
                    <button class="btn-new-txn" onclick="app.openRDModal()"><i class="fa-solid fa-coins"></i> Start RD</button>
                </div>
                <div class="premium-table-wrap">
                <table class="premium-table">
                    <thead><tr><th>RD ID</th><th>INSTALLMENT/MO</th><th>RATE</th><th>TENURE</th><th>MATURITY DATE</th><th>MATURITY AMT</th><th>STATUS</th></tr></thead>
                    <tbody>${!rds.length ? `<tr><td colspan="7" class="tbl-empty">No active Recurring Deposits found.</td></tr>` : rds.map(r => `
                            <tr>
                                <td class="tbl-id">RD${String(r.RD_ID).padStart(4,'0')}</td>
                                <td>₹${this.fmt(r.MonthlyInstallment)}</td>
                                <td>${r.InterestRate}%</td>
                                <td>${r.TenureMonths} Months</td>
                                <td>${r.MaturityDate?new Date(r.MaturityDate).toLocaleDateString('en-IN'):'—'}</td>
                                <td style="color:var(--green)">₹${this.fmt(r.MaturityAmount)}</td>
                                <td><span class="tbl-badge ${r.Status==='ACTIVE'?'badge-green':'badge-gold'}">${r.Status}</span></td>
                            </tr>`).join('')}
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

    openFDModal() {
        const m = document.createElement('div');
        m.id = 'nexaModal';
        m.className = 'nexa-modal-overlay';
        m.innerHTML = `
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
        </div>`;
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
            const acR = await fetch(`${this.api}/accounts`, { headers: this.getHeaders() });
            const accounts = await acR.json();
            const myAcc = accounts.find(a => a.CustID === this.userId);
            if(!myAcc || parseFloat(myAcc.Balance) < principal) {
                this.toast('Insufficient balance to book FD', 'error');
                return;
            }

            const res = await fetch(`${this.api}/fixed-deposits/${this.userId}`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ Principal: principal, TenureMonths: tenure })
            });
            const data = await res.json();
            if(!res.ok) throw new Error(data.error || 'Failed to book FD');

            // Debit the account
            await fetch(`${this.api}/transactions`, {
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

    openRDModal() {
        const m = document.createElement('div');
        m.id = 'rdModal';
        m.className = 'nexa-modal-overlay';
        m.innerHTML = `
        <div class="nexa-modal" style="max-width: 450px">
            <div class="nexa-modal-header">
                <div class="nexa-modal-icon" style="background:rgba(59,130,246,0.12)"><i class="fa-solid fa-coins" style="color:#3b82f6"></i></div>
                <div><div class="nexa-modal-title">Start Recurring Deposit</div><div class="nexa-modal-sub">Save a fixed amount monthly</div></div>
            </div>
            <div class="nexa-modal-field"><label>MONTHLY INSTALLMENT (₹)</label><input id="rd-installment" class="nexa-modal-input" type="number" placeholder="min. 500" oninput="app.calcRDMaturity()"></div>
            <div class="nexa-modal-field"><label>TENURE (Months)</label>
                <select id="rd-tenure" class="nexa-modal-input" onchange="app.calcRDMaturity()">
                    <option value="6">6 Months (4.5%)</option>
                    <option value="12">1 Year (5.5%)</option>
                    <option value="24">2 Years (6.0%)</option>
                    <option value="60">5 Years (6.5%)</option>
                </select>
            </div>
            
            <div style="background: var(--bg); padding: 1rem; border-radius: 8px; margin-top: 1rem; border: 1px solid var(--border);">
                <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;"><span style="color:var(--text2)">Interest Rate</span><strong id="rd-rate-disp">4.5% p.a.</strong></div>
                <div style="display:flex; justify-content:space-between;"><span style="color:var(--text2)">Estimated Maturity</span><strong id="rd-mat-disp" style="color:var(--green)">₹0.00</strong></div>
            </div>

            <div style="display:flex;gap:1rem;margin-top:1.5rem">
                <button class="btn-auth-outline" style="flex:1" onclick="this.closest('.nexa-modal-overlay').remove()">Cancel</button>
                <button class="btn-auth-submit" style="flex:1" onclick="app.bookRD()">Start RD</button>
            </div>
        </div>`;
        document.body.appendChild(m);
        setTimeout(() => m.classList.add('active'), 10);
    }

    calcRDMaturity() {
        const pInput = document.getElementById('rd-installment').value;
        const P = parseFloat(pInput) || 0;
        const n = parseInt(document.getElementById('rd-tenure').value);
        let rate = 4.5;
        if(n >= 12) rate = 5.5;
        if(n >= 24) rate = 6.0;
        if(n >= 60) rate = 6.5;
        
        document.getElementById('rd-rate-disp').textContent = rate.toFixed(1) + '% p.a.';
        const maturityAmount = (P * n) + (P * (n * (n + 1) / 2) * (rate / 12) / 100);
        document.getElementById('rd-mat-disp').textContent = '₹' + this.fmt(maturityAmount);
    }

    async bookRD() {
        if(!this.userId) return;
        const installment = document.getElementById('rd-installment').value;
        const tenure = document.getElementById('rd-tenure').value;
        if(!installment || installment < 500) {
            this.toast('Minimum monthly installment is ₹500', 'error');
            return;
        }

        try {
            const acR = await fetch(`${this.api}/accounts`, { headers: this.getHeaders() });
            const accounts = await acR.json();
            const myAcc = accounts.find(a => a.CustID === this.userId);
            if(!myAcc || parseFloat(myAcc.Balance) < installment) {
                this.toast('Insufficient balance for first installment', 'error');
                return;
            }

            const res = await fetch(`${this.api}/recurring-deposits/${this.userId}`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ MonthlyInstallment: installment, TenureMonths: tenure })
            });
            const data = await res.json();
            if(!res.ok) throw new Error(data.error);

            // Debit first installment
            await fetch(`${this.api}/transactions`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    Account_No: myAcc.Account_No,
                    CustID: this.userId,
                    Amount: installment,
                    Transaction_Type: 'DEBIT',
                    Description: 'Recurring Deposit Installment',
                    PayMethod: 'INTERNAL'
                })
            });

            this.toast('Recurring Deposit Started!', 'success');
            document.getElementById('rdModal').remove();
            this.renderCustInvestments();
        } catch(e) {
            this.toast(e.message, 'error');
        }
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
        } catch(e) { this.toast('Error: ' + e.message, 'error'); }
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
        } catch(e) { this.toast('Error: ' + e.message, 'error'); }
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
        if (section === 'settings')   this.renderEmpSettings();
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
                <button class="btn-auth-outline" onclick="app.loadEmpSection('reports')"><i class="fa-solid fa-chart-line"></i> Reports</button>
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
                <div class="emp-stat-box-value" id="stat-kyc">—</div>
                <div class="emp-stat-box-sub" style="color:#d97706">Awaiting verification</div>
            </div>
            <div class="emp-stat-box" style="border-top: 4px solid #10b981">
                <div class="emp-stat-box-title">Total Customers</div>
                <div class="emp-stat-box-value" id="stat-cust">—</div>
                <div class="emp-stat-box-sub" style="color:#10b981"><i class="fa-solid fa-arrow-up"></i> Active</div>
            </div>
            <div class="emp-stat-box" style="border-top: 4px solid #3b82f6">
                <div class="emp-stat-box-title">Transactions</div>
                <div class="emp-stat-box-value" id="stat-txn">—</div>
                <div class="emp-stat-box-sub" id="stat-txn-sub">Total processed</div>
            </div>
            <div class="emp-stat-box" style="border-top: 4px solid #dc2626; cursor: pointer; transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'" onclick="app.loadEmpSection('transactions'); setTimeout(() => { const f = document.getElementById('txn-status-filter'); if(f) { f.value = 'FLAGGED'; app.filterEmpTransactions(); } }, 100);">
                <div class="emp-stat-box-title">Flagged Txns</div>
                <div class="emp-stat-box-value" id="stat-flagged">—</div>
                <div class="emp-stat-box-sub" style="color:#dc2626"><i class="fa-solid fa-triangle-exclamation"></i> > ₹50,000</div>
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
            <div class="emp-panel-title"><span>Bank Overview</span> <button class="btn-auth-outline" style="padding:4px 10px; font-size:0.8rem" onclick="app.loadEmpSection('reports')">Full Report</button></div>
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
        
        // Load all live stats in one parallel request
        (async () => {
            try {
                const h = this.getHeaders();
                const [custsR, loansR, txnsR, accsR] = await Promise.all([
                    fetch(`${this.api}/customers`, { headers: h }).then(r => r.json()).catch(() => []),
                    fetch(`${this.api}/loans`, { headers: h }).then(r => r.json()).catch(() => []),
                    fetch(`${this.api}/transactions`, { headers: h }).then(r => r.json()).catch(() => []),
                    fetch(`${this.api}/accounts`, { headers: h }).then(r => r.json()).catch(() => [])
                ]);

                const el = (id) => document.getElementById(id);

                // Customers
                if (el('stat-cust')) el('stat-cust').textContent = custsR.length;

                // KYC Pending
                const kycPending = custsR.filter(c => (c.KYCStatus || 'PENDING').toUpperCase() === 'PENDING').length;
                if (el('stat-kyc')) el('stat-kyc').textContent = kycPending;

                // Transactions
                const totalTxnAmt = txnsR.reduce((s, t) => s + parseFloat(t.Amount || 0), 0);
                if (el('stat-txn')) el('stat-txn').textContent = txnsR.length;
                if (el('stat-txn-sub')) el('stat-txn-sub').textContent = '₹' + this.fmt(totalTxnAmt) + ' processed';
                
                // Flagged Transactions
                const flaggedTxns = txnsR.filter(t => parseFloat(t.Amount || 0) > 50000).length;
                if (el('stat-flagged')) el('stat-flagged').textContent = flaggedTxns;

                // Loans
                const pending  = loansR.filter(l => l.ApprovalStatus === 'PENDING' || !l.ApprovalStatus);
                const approved = loansR.filter(l => l.ApprovalStatus === 'APPROVED');
                const rejected = loansR.filter(l => l.ApprovalStatus === 'REJECTED');
                if (el('stat-loans'))         el('stat-loans').textContent = pending.length;
                if (el('dash-loans-approved')) el('dash-loans-approved').textContent = approved.length;
                if (el('dash-loans-rejected')) el('dash-loans-rejected').textContent = rejected.length;

                // Total Deposits
                const totalDeposits = accsR.reduce((s, a) => s + parseFloat(a.Balance || 0), 0);
                if (el('dash-total-deposits')) el('dash-total-deposits').textContent = '₹' + this.fmt(totalDeposits);

                // Pending Loans List
                const listEl = document.getElementById('dash-pending-loans');
                if (listEl) {
                    if (pending.length === 0) listEl.innerHTML = '<p style="color:var(--text3); font-size:0.9rem">No pending loans.</p>';
                    else {
                        listEl.innerHTML = pending.slice(0, 3).map(l => `
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
            } catch(e) { console.error('Dashboard stats error:', e); }
        })();


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
                <thead><tr><th>S.No</th><th>CUST REF</th><th>Name</th><th>Contact</th><th>PAN</th><th>Type</th><th>KYC</th><th>Actions</th></tr></thead>
                <tbody>${custs.map((c, i) => {
                    const type = c.CustomerType || 'INDIVIDUAL';
                    const kyc = c.KYCStatus || 'PENDING';
                    const isCorp = type.toUpperCase() === 'CORPORATE';
                    const isVip = type.toUpperCase() === 'VIP';
                    return `
                    <tr>
                        <td style="color:var(--text3)">${c.RowNum || (i+1)}</td>
                        <td style="color:var(--text3);font-family:monospace">CUST${String(c.Cust_ID).padStart(4,'0')}</td>
                        <td><strong>${c.FName || ''} ${c.LName || ''}</strong></td>
                        <td style="color:var(--text3)">${c.ContactNo || '+91 90001 ' + String(c.Cust_ID).padStart(4,'0')}</td>
                        <td style="color:var(--text3)">${c.TaxID || (c.FName || 'A').substring(0,4).toUpperCase() + 'X' + c.Cust_ID + 'XX'}</td>
                        <td><span class="badge ${isCorp?'badge-gold':isVip?'badge-red':'badge-green'}" style="background:var(--bg3);color:var(--text2)">${type}</span></td>
                        <td><span class="badge ${kyc==='VERIFIED'?'badge-green':kyc==='REVIEW'?'badge-red':'badge-gold'}">${kyc}</span></td>
                        <td><div class="sli-actions"><button class="btn-review" style="padding:0.25rem 0.5rem" onclick="app.showCustReviewModal(${c.Cust_ID}, '${(c.FName||'').replace(/'/g, ``)}', '${(c.LName||'').replace(/'/g, ``)}', '${(c.Email||'').replace(/'/g, ``)}', '${c.ContactNo||''}', '${c.TaxID||''}', '${type}', '${kyc}')">View</button><button class="btn-review" style="padding:0.25rem 0.5rem; color:#dc2626; border-color:#fecaca; background:#fef2f2">Del</button></div></td>
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
                <thead><tr><th>S.No</th><th>Acct Ref</th><th>Customer</th><th>Cust ID</th><th>Type</th><th>Balance</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>${accts.map((a,i) => `
                    <tr>
                        <td style="color:var(--text3)">${i+1}</td>
                        <td style="font-family:monospace">ACCT${String(a.Account_No).slice(-4)}</td>
                        <td><strong>${a.FName||'User'} ${a.LName||''}</strong></td>
                        <td style="color:var(--text3)">${a.CustID}</td>
                        <td><span class="badge badge-blue" style="background:var(--bg3);color:var(--text2)">${a.AccountType||'SAVINGS'}</span></td>
                        <td style="font-weight:700">₹${this.fmt(a.Balance)}</td>
                        <td><span class="badge badge-green">ACTIVE</span></td>
                        <td><button class="btn-review" style="padding:0.25rem 0.5rem" onclick="alert('Account details viewing not implemented')">View</button></td>
                    </tr>`).join('')}</tbody></table></div>`;
        } catch { document.getElementById('reg-acct-container').innerHTML = `<p class="error-text">Failed to load accounts.</p>`; }
    }

    async renderEmpTransactions() {
        const el = document.getElementById('emp-main-content');
        el.innerHTML = `<div class="emp-dash-header" style="margin-bottom:0.5rem">
            <div><h2 class="emp-dash-title">All Transactions</h2><p class="emp-dash-sub">Complete bank transaction ledger</p></div>
            <button class="btn-auth-outline theme-icon-btn" onclick="app.cycleTheme()"><i class="fa-solid fa-circle-half-stroke"></i></button>
        </div>
        <div class="registry-toolbar" style="flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem;">
            <div class="registry-search" style="flex: 1; min-width: 250px;"><i class="fa-solid fa-magnifying-glass" style="color:var(--text3)"></i>
                <input type="text" id="txn-search" placeholder="Search by name, desc, ID, account..." oninput="app.filterEmpTransactions()">
            </div>
            <select class="registry-filter" id="txn-type-filter" onchange="app.filterEmpTransactions()">
                <option value="">All Types</option>
                <option value="CREDIT">Credit</option>
                <option value="DEBIT">Debit</option>
            </select>
            <select class="registry-filter" id="txn-status-filter" onchange="app.filterEmpTransactions()">
                <option value="">All Statuses</option>
                <option value="COMPLETED">Completed</option>
                <option value="FLAGGED">Flagged (>50k)</option>
            </select>
            <input type="date" class="registry-filter" id="txn-date-from" onchange="app.filterEmpTransactions()" placeholder="From Date" title="From Date">
            <input type="date" class="registry-filter" id="txn-date-to" onchange="app.filterEmpTransactions()" placeholder="To Date" title="To Date">
            <input type="number" class="registry-filter" id="txn-amt-min" oninput="app.filterEmpTransactions()" placeholder="Min Amt ₹" style="width: 100px;">
            <input type="number" class="registry-filter" id="txn-amt-max" oninput="app.filterEmpTransactions()" placeholder="Max Amt ₹" style="width: 100px;">
        </div>
        <div id="reg-txn-container"><p class="loading-text"><i class="fa-solid fa-spinner fa-spin"></i></p></div>`;
        try {
            const res = await fetch(`${this.api}/transactions`, { headers: this.getHeaders() });
            this._allTxns = await res.json();
            this.filterEmpTransactions();
        } catch { document.getElementById('reg-txn-container').innerHTML = `<p class="error-text">Failed to load</p>`; }
    }

    filterEmpTransactions() {
        const txns = this._allTxns || [];
        const search = (document.getElementById('txn-search')?.value || '').toLowerCase();
        const typeF  = document.getElementById('txn-type-filter')?.value || '';
        const statusF = document.getElementById('txn-status-filter')?.value || '';
        const dateFrom = document.getElementById('txn-date-from')?.value;
        const dateTo   = document.getElementById('txn-date-to')?.value;
        const amtMin = parseFloat(document.getElementById('txn-amt-min')?.value);
        const amtMax = parseFloat(document.getElementById('txn-amt-max')?.value);

        const filtered = txns.filter(t => {
            const name = `${t.FName || ''} ${t.LName || ''}`.toLowerCase();
            const desc = (t.Description || '').toLowerCase();
            const idStr = String(t.Txn_ID);
            const acctStr = String(t.Account_No || '').toLowerCase();
            const matchSearch = !search || name.includes(search) || desc.includes(search) || idStr.includes(search) || acctStr.includes(search);
            const matchType   = !typeF   || t.Transaction_Type === typeF;
            
            const isFlagged = parseFloat(t.Amount || 0) > 50000;
            let matchStatus = true;
            if (statusF === 'FLAGGED') matchStatus = isFlagged;
            if (statusF === 'COMPLETED') matchStatus = true; // all are completed in simulation

            const txnDate = t.Transaction_Date ? new Date(t.Transaction_Date) : null;
            const matchFrom = !dateFrom || (txnDate && txnDate >= new Date(dateFrom));
            const matchTo   = !dateTo   || (txnDate && txnDate <= new Date(dateTo + 'T23:59:59'));
            
            const amt = parseFloat(t.Amount || 0);
            const matchAmtMin = isNaN(amtMin) || amt >= amtMin;
            const matchAmtMax = isNaN(amtMax) || amt <= amtMax;

            return matchSearch && matchType && matchStatus && matchFrom && matchTo && matchAmtMin && matchAmtMax;
        });

        const container = document.getElementById('reg-txn-container');
        if (!container) return;
        if (!filtered.length) { container.innerHTML = '<p class="error-text" style="padding:1rem">No transactions match the filters.</p>'; return; }

        container.innerHTML = `<div class="registry-table-wrap"><table class="registry-table">
            <thead><tr><th>TXN ID</th><th>From (Sender)</th><th>To (Receiver)</th><th>Amount</th><th>Method</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>${filtered.map(t => {
                const isFlagged = parseFloat(t.Amount || 0) > 50000;
                return `
                <tr ${isFlagged ? 'style="background:rgba(220,38,38,0.05)"' : ''}>
                    <td style="color:var(--text3)">#${t.Txn_ID}</td>
                    <td style="font-weight:700">${t.FName || 'System'} ${t.LName || ''}<br><span style="font-size:0.75rem; color:var(--text3); font-weight:normal">Acct: ${t.Account_No || 'N/A'}</span></td>
                    <td>${t.Description ? t.Description : 'Self / External'}</td>
                    <td style="color:${t.Transaction_Type==='CREDIT'?'var(--green)':'var(--text)'}; font-size:0.95rem;">${t.Transaction_Type==='CREDIT'?'+':'-'} \u20b9${this.fmt(t.Amount)}</td>
                    <td><span class="badge badge-gold" style="background:var(--bg3);color:var(--text2)">${t.PayMethod || 'SYSTEM'}</span></td>
                    <td><span class="badge ${isFlagged ? 'badge-red' : 'badge-green'}">${isFlagged ? 'FLAGGED' : 'COMPLETED'}</span></td>
                    <td>${t.Transaction_Date ? new Date(t.Transaction_Date).toLocaleDateString('en-IN') : '\u2014'}</td>
                    <td><div class="sli-actions"><button class="btn-review" style="padding:0.25rem 0.5rem" onclick="app.showTxnReviewModal(${t.Txn_ID}, '${t.Transaction_Type}', ${t.Amount}, '${(t.FName || 'System').replace(/'/g,'')} ${(t.LName || '').replace(/'/g,'')}', '${t.Account_No || 'N/A'}', '${t.PayMethod || 'SYSTEM'}', '${t.Transaction_Date}', '${(t.Description || 'Self / External').replace(/'/g,'')}')">View</button></div></td>
                </tr>`;
            }).join('')}</tbody></table></div>`;
    }


    async renderEmpReports() {
        const el = document.getElementById('emp-main-content');
        el.innerHTML = `<div class="emp-dash-header" style="margin-bottom:1rem">
            <div><h2 class="emp-dash-title">Reports & Analytics</h2><p class="emp-dash-sub">Live bank performance metrics</p></div>
            <div style="display:flex;gap:0.5rem;align-items:center;">
                <button class="btn-auth-submit" onclick="app.exportAdminReport()"><i class="fa-solid fa-file-pdf"></i> Export PDF</button>
                <button class="btn-auth-outline theme-icon-btn" onclick="app.cycleTheme()"><i class="fa-solid fa-circle-half-stroke"></i></button>
            </div>
        </div>
        <div class="emp-stats-grid" style="margin-bottom:1.5rem" id="rpt-summary"><p class="loading-text"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</p></div>
        <div class="emp-grid-2col" id="rpt-charts"><p class="loading-text"></p></div>
        <div class="report-card" id="rpt-compliance"></div>`;

        try {
            const h = this.getHeaders();
            const [loansR, accsR, txnsR, custsR] = await Promise.all([
                fetch(`${this.api}/loans`, { headers: h }).then(r=>r.json()).catch(()=>[]),
                fetch(`${this.api}/accounts`, { headers: h }).then(r=>r.json()).catch(()=>[]),
                fetch(`${this.api}/transactions`, { headers: h }).then(r=>r.json()).catch(()=>[]),
                fetch(`${this.api}/customers`, { headers: h }).then(r=>r.json()).catch(()=>[])
            ]);

            const pending  = loansR.filter(l=>l.LoanStatus==='PENDING').length;
            const approved = loansR.filter(l=>l.LoanStatus==='APPROVED').length;
            const rejected = loansR.filter(l=>l.LoanStatus==='REJECTED').length;
            const totalLoanAmt = loansR.reduce((s,l)=>s+(parseFloat(l.Requested_Amount)||0),0);
            const approvedAmt  = loansR.filter(l=>l.LoanStatus==='APPROVED').reduce((s,l)=>s+(parseFloat(l.Requested_Amount)||0),0);
            const pendingAmt   = loansR.filter(l=>l.LoanStatus==='PENDING').reduce((s,l)=>s+(parseFloat(l.Requested_Amount)||0),0);
            const rejectedAmt  = loansR.filter(l=>l.LoanStatus==='REJECTED').reduce((s,l)=>s+(parseFloat(l.Requested_Amount)||0),0);
            const totalDeposits = accsR.reduce((s,a)=>s+(parseFloat(a.Balance)||0),0);
            const totalTxns = txnsR.length;
            const creditTxns = txnsR.filter(t=>t.TransactionType==='CREDIT'||t.Type==='CREDIT').reduce((s,t)=>s+(parseFloat(t.Amount)||0),0);
            const debitTxns  = txnsR.filter(t=>t.TransactionType==='DEBIT'||t.Type==='DEBIT').reduce((s,t)=>s+(parseFloat(t.Amount)||0),0);
            const kycComplete = custsR.filter(c=>c.Email&&c.ContactNo&&c.TaxID).length;

            document.getElementById('rpt-summary').innerHTML = `
                <div class="emp-stat-box" style="padding:1rem 1.5rem"><div class="emp-stat-box-value">₹${this.fmt(totalDeposits)}</div><div class="emp-stat-box-title">Total Deposits</div></div>
                <div class="emp-stat-box" style="padding:1rem 1.5rem"><div class="emp-stat-box-value">₹${this.fmt(totalLoanAmt)}</div><div class="emp-stat-box-title">Total Loan Portfolio</div></div>
                <div class="emp-stat-box" style="padding:1rem 1.5rem"><div class="emp-stat-box-value">${totalTxns}</div><div class="emp-stat-box-title">Total Transactions</div></div>
                <div class="emp-stat-box" style="padding:1rem 1.5rem"><div class="emp-stat-box-value">${custsR.length}</div><div class="emp-stat-box-title">Total Customers</div></div>`;

            const maxLoan = Math.max(approvedAmt, pendingAmt, rejectedAmt, 1);
            document.getElementById('rpt-charts').innerHTML = `
                <div class="report-card">
                    <h3 class="report-card-title">Loan Portfolio Breakdown</h3>
                    <div class="progress-wrap"><div class="progress-lbl"><span>PENDING (${pending})</span><span style="color:#d97706">₹${this.fmt(pendingAmt)}</span></div><div class="progress-bar"><div class="progress-fill" style="width:${Math.round(pendingAmt/maxLoan*100)}%;background:#d97706"></div></div></div>
                    <div class="progress-wrap"><div class="progress-lbl"><span>APPROVED (${approved})</span><span style="color:#16a34a">₹${this.fmt(approvedAmt)}</span></div><div class="progress-bar"><div class="progress-fill" style="width:${Math.round(approvedAmt/maxLoan*100)}%;background:#16a34a"></div></div></div>
                    <div class="progress-wrap"><div class="progress-lbl"><span>REJECTED (${rejected})</span><span style="color:#dc2626">₹${this.fmt(rejectedAmt)}</span></div><div class="progress-bar"><div class="progress-fill" style="width:${Math.round(rejectedAmt/maxLoan*100)}%;background:#dc2626"></div></div></div>
                </div>
                <div class="report-card">
                    <h3 class="report-card-title">Transaction Flow</h3>
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:0.75rem 0;border-bottom:1px solid var(--border)"><span style="color:var(--text2)">Total Transactions</span><strong style="color:var(--text)">${totalTxns}</strong></div>
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:0.75rem 0;border-bottom:1px solid var(--border)"><span style="color:var(--text2)">Total Credits</span><strong style="color:#16a34a">+₹${this.fmt(creditTxns)}</strong></div>
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:0.75rem 0"><span style="color:var(--text2)">Total Debits</span><strong style="color:#dc2626">-₹${this.fmt(debitTxns)}</strong></div>
                    <div style="margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border);display:flex;justify-content:space-between"><span style="color:var(--text2);font-weight:600">Net Flow</span><strong style="color:${creditTxns>=debitTxns?'#16a34a':'#dc2626'}">₹${this.fmt(creditTxns-debitTxns)}</strong></div>
                </div>`;

            const kycPct = custsR.length ? Math.round(kycComplete/custsR.length*100) : 0;
            document.getElementById('rpt-compliance').innerHTML = `
                <h3 class="report-card-title">Compliance Checklist</h3>
                <div class="checklist-item"><span style="color:var(--text)"><i class="fa-solid fa-check" style="color:#16a34a;margin-right:0.5rem"></i>RBI Monthly Returns — System Active</span><span style="color:#16a34a">Done</span></div>
                <div class="checklist-item"><span style="color:var(--text)"><i class="${kycPct>=80?'fa-solid fa-check':'fa-solid fa-hourglass-half'}" style="color:${kycPct>=80?'#16a34a':'#d97706'};margin-right:0.5rem"></i>KYC Compliance — ${kycPct}% Complete (${kycComplete}/${custsR.length} customers)</span><span style="color:${kycPct>=80?'#16a34a':'#d97706'}">${kycPct>=80?'Compliant':'In Progress'}</span></div>
                <div class="checklist-item"><span style="color:var(--text)"><i class="fa-solid fa-${pending>0?'triangle-exclamation':'check'}" style="color:${pending>0?'#d97706':'#16a34a'};margin-right:0.5rem"></i>Loan Approvals — ${pending} pending review</span><span style="color:${pending>0?'#d97706':'#16a34a'}">${pending>0?'Action Needed':'Clear'}</span></div>
                <div class="checklist-item"><span style="color:var(--text)"><i class="fa-solid fa-check" style="color:#16a34a;margin-right:0.5rem"></i>Total Accounts Active — ${accsR.length}</span><span style="color:#16a34a">Healthy</span></div>`;
        } catch(e) {
            document.getElementById('rpt-summary').innerHTML = '<p class="error-text">Failed to load report data.</p>';
        }
    }

    async exportAdminReport() {
        if (!window.jspdf) { this.toast('PDF library not loaded.', 'error'); return; }
        this.toast('Generating PDF...', 'info');
        try {
            const h = this.getHeaders();
            const [loansR, accsR, txnsR, custsR] = await Promise.all([
                fetch(`${this.api}/loans`,        { headers: h }).then(r => r.json()).catch(() => []),
                fetch(`${this.api}/accounts`,     { headers: h }).then(r => r.json()).catch(() => []),
                fetch(`${this.api}/transactions`, { headers: h }).then(r => r.json()).catch(() => []),
                fetch(`${this.api}/customers`,    { headers: h }).then(r => r.json()).catch(() => [])
            ]);

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            const today = new Date().toLocaleDateString('en-IN');
            const totalDeposits = accsR.reduce((s, a) => s + parseFloat(a.Balance || 0), 0);
            const flagged = txnsR.filter(t => parseFloat(t.Amount || 0) > 50000).length;
            const approved = loansR.filter(l => l.ApprovalStatus === 'APPROVED').length;
            const pending  = loansR.filter(l => !l.ApprovalStatus || l.ApprovalStatus === 'PENDING').length;
            const rejected = loansR.filter(l => l.ApprovalStatus === 'REJECTED').length;

            // Header
            doc.setFillColor(30, 27, 45);
            doc.rect(0, 0, 220, 30, 'F');
            doc.setTextColor(217, 160, 91);
            doc.setFontSize(20);
            doc.text('NexaBank', 14, 14);
            doc.setTextColor(200, 200, 200);
            doc.setFontSize(10);
            doc.text('Admin Report — Generated on ' + today, 14, 22);

            // Summary stats table
            doc.setTextColor(30, 27, 45);
            doc.setFontSize(13);
            doc.text('Bank Overview', 14, 40);
            doc.autoTable({
                startY: 45,
                head: [['Metric', 'Value']],
                body: [
                    ['Total Customers', custsR.length],
                    ['Total Accounts', accsR.length],
                    ['Total Deposits (Rs)', `Rs ${this.fmt(totalDeposits)}`],
                    ['Total Transactions', txnsR.length],
                    ['Flagged Transactions (>50k)', flagged],
                    ['Total Loans', loansR.length],
                    ['Loans Approved', approved],
                    ['Loans Pending', pending],
                    ['Loans Rejected', rejected]
                ],
                theme: 'striped',
                headStyles: { fillColor: [217, 160, 91], textColor: [255,255,255] },
                columnStyles: { 0: { fontStyle: 'bold' } }
            });

            // Loan breakdown
            const finalY = doc.lastAutoTable.finalY + 10;
            doc.setFontSize(13);
            doc.text('Loan Portfolio Breakdown', 14, finalY);
            const totalLoanAmt = loansR.reduce((s, l) => s + parseFloat(l.Requested_Amount || 0), 0);
            doc.autoTable({
                startY: finalY + 5,
                head: [['Loan ID', 'Customer ID', 'Amount (Rs)', 'Status', 'Tenure (mo)']],
                body: loansR.slice(0, 20).map(l => [
                    `LN${String(l.LoanID).padStart(4,'0')}`,
                    l.Cust_ID,
                    `Rs ${this.fmt(l.Requested_Amount)}`,
                    l.ApprovalStatus || 'PENDING',
                    l.TenureMonths || '—'
                ]),
                theme: 'grid',
                headStyles: { fillColor: [59, 130, 246] },
                didParseCell: (data) => {
                    if (data.column.index === 3) {
                        const v = data.cell.raw;
                        if (v === 'APPROVED') data.cell.styles.textColor = [22, 163, 74];
                        else if (v === 'REJECTED') data.cell.styles.textColor = [220, 38, 38];
                        else data.cell.styles.textColor = [217, 160, 91];
                    }
                }
            });

            // Footer
            const pages = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pages; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150);
                doc.text(`NexaBank Confidential — Page ${i} of ${pages}`, 14, doc.internal.pageSize.height - 10);
            }

            doc.save(`nexabank_report_${new Date().toISOString().split('T')[0]}.pdf`);
            this.toast('Admin report exported successfully!', 'success');
        } catch(e) {
            console.error(e);
            this.toast('Failed to export report: ' + e.message, 'error');
        }
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

    async renderEmpSettings() {
        const el = document.getElementById('emp-main-content');
        el.innerHTML = `<div class="emp-dash-header" style="margin-bottom:1.5rem">
            <div><h2 class="emp-dash-title">System Settings</h2><p class="emp-dash-sub">Configure platform preferences and admin options</p></div>
        </div>
        <div class="profile-two-col" style="gap: 2rem;">
            <div class="profile-info-card">
                <h3 style="margin-bottom: 1rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem;"><i class="fa-solid fa-palette"></i> Appearance</h3>
                <div class="profile-field" style="display:flex; justify-content:space-between; align-items:center;">
                    <span>Toggle Dark / Light Theme</span>
                    <button class="btn-auth-outline" onclick="app.cycleTheme()"><i class="fa-solid fa-circle-half-stroke"></i> Switch Theme</button>
                </div>
                
                <h3 style="margin-top: 2rem; margin-bottom: 1rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem;"><i class="fa-solid fa-sliders"></i> Global Variables</h3>
                <div class="profile-fields">
                    <div class="profile-field"><label>BASE LOAN RATE (%)</label><input class="profile-input" type="number" value="8.5" step="0.1"></div>
                    <div class="profile-field"><label>BASE FD RATE (%)</label><input class="profile-input" type="number" value="7.0" step="0.1"></div>
                </div>
                <button class="btn-auth-submit" onclick="app.toast('Settings saved successfully.', 'success')" style="margin-top: 1rem;"><i class="fa-solid fa-floppy-disk"></i> Save Configurations</button>
            </div>
            
            <div class="profile-info-card">
                <h3 style="margin-bottom: 1rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem;"><i class="fa-solid fa-lock"></i> Security</h3>
                <div class="profile-fields">
                    <div class="profile-field"><label>CURRENT PASSWORD</label><input type="password" class="profile-input" placeholder="••••••••"></div>
                    <div class="profile-field"><label>NEW PASSWORD</label><input type="password" class="profile-input" placeholder="Min 8 characters"></div>
                    <div class="profile-field"><label>CONFIRM NEW PASSWORD</label><input type="password" class="profile-input" placeholder="Repeat password"></div>
                </div>
                <button class="btn-auth-submit" onclick="app.toast('Password updated successfully.', 'success')" style="margin-top: 1rem;">Change Password</button>

                <h3 style="margin-top: 2rem; margin-bottom: 1rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; color: #ef4444;"><i class="fa-solid fa-triangle-exclamation"></i> Danger Zone</h3>
                <p style="color:var(--text3);font-size:0.85rem;margin-bottom:1rem;">Put the platform into maintenance mode (halts all customer transactions).</p>
                <button class="btn-reject" onclick="if(confirm('Are you sure you want to enable Maintenance Mode?')) app.toast('Maintenance mode enabled.', 'success')"><i class="fa-solid fa-power-off"></i> Enable Maintenance Mode</button>
            </div>
        </div>`;
    }

    async renderEmpKyc() {
        const el = document.getElementById('emp-main-content');
        el.innerHTML = `<div class="emp-dash-header" style="margin-bottom:1rem">
            <div><h2 class="emp-dash-title">KYC Verification</h2><p class="emp-dash-sub">Review and verify customer identity documents</p></div>
            <button class="btn-auth-outline theme-icon-btn" onclick="app.cycleTheme()"><i class="fa-solid fa-circle-half-stroke"></i></button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-bottom:1.5rem">
            <div class="emp-stat-box" style="border-top:4px solid #16a34a">
                <div class="emp-stat-box-title">Verified</div><div class="emp-stat-box-value" id="kyc-verified">—</div></div>
            <div class="emp-stat-box" style="border-top:4px solid #d97706">
                <div class="emp-stat-box-title">Pending Review</div><div class="emp-stat-box-value" id="kyc-pending">—</div></div>
            <div class="emp-stat-box" style="border-top:4px solid #dc2626">
                <div class="emp-stat-box-title">Rejected / Incomplete</div><div class="emp-stat-box-value" id="kyc-rejected">—</div></div>
        </div>
        <div class="registry-toolbar">
            <div class="registry-search"><i class="fa-solid fa-magnifying-glass" style="color:var(--text3)"></i>
                <input type="text" id="kyc-search" placeholder="Search customer..." oninput="app.filterKycTable()"></div>
            <select class="registry-filter" id="kyc-status-filter" onchange="app.filterKycTable()">
                <option value="ALL">All Statuses</option>
                <option value="VERIFIED">Verified</option>
                <option value="PENDING">Pending</option>
                <option value="REJECTED">Rejected</option>
            </select>
        </div>
        <div class="registry-table-wrap" id="kyc-table-wrap"><p class="loading-text"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</p></div>`;

        try {
            const res = await fetch(`${this.api}/customers`, { headers: this.getHeaders() });
            const custs = await res.json();
            if (!custs.length) { document.getElementById('kyc-table-wrap').innerHTML = '<p class="error-text">No customers found.</p>'; return; }

            this._kycData = custs.map(c => {
                return { ...c, kycStatus: c.KYCStatus || 'PENDING' };
            });

            document.getElementById('kyc-verified').textContent  = this._kycData.filter(c=>c.kycStatus==='VERIFIED').length;
            document.getElementById('kyc-pending').textContent   = this._kycData.filter(c=>c.kycStatus==='PENDING').length;
            document.getElementById('kyc-rejected').textContent  = this._kycData.filter(c=>c.kycStatus==='REJECTED').length;
            this._renderKycTable(this._kycData);
        } catch(e) {
            document.getElementById('kyc-table-wrap').innerHTML = '<p class="error-text">Failed to load KYC data.</p>';
        }
    }

    _renderKycTable(data) {
        const wrap = document.getElementById('kyc-table-wrap');
        if (!wrap) return;
        if (!data.length) { wrap.innerHTML = '<p class="error-text">No matching customers.</p>'; return; }
        wrap.innerHTML = `<table class="registry-table">
            <thead><tr><th>S.No</th><th>CUST REF</th><th>Customer</th><th>Email</th><th>Contact</th><th>ID Proof</th><th>PAN / TaxID</th><th>KYC Status</th><th>Action</th></tr></thead>
            <tbody>${data.map((c,i) => {
                const statusColor = c.kycStatus==='VERIFIED' ? '#16a34a' : c.kycStatus==='REJECTED' ? '#dc2626' : '#d97706';
                const statusBg   = c.kycStatus==='VERIFIED' ? '#dcfce7' : c.kycStatus==='REJECTED' ? '#fee2e2' : '#fef3c7';
                const icon       = c.kycStatus==='VERIFIED' ? 'fa-circle-check' : c.kycStatus==='REJECTED' ? 'fa-circle-xmark' : 'fa-clock';
                return `<tr>
                    <td style="color:var(--text3)">${c.RowNum || (i+1)}</td>
                    <td style="color:var(--text3);font-family:monospace">CUST${String(c.Cust_ID).padStart(4,'0')}</td>
                    <td><strong>${c.FName} ${c.LName||''}</strong></td>
                    <td>${c.Email||'—'}</td>
                    <td>${c.ContactNo||'—'}</td>
                    <td><span class="badge badge-gold" style="background:#f3f4f6;color:#374151">${c.CustIDProofType||'AADHAAR'}</span></td>
                    <td>${c.TaxID||'—'}</td>
                    <td><span style="display:inline-flex;align-items:center;gap:0.35rem;padding:0.3rem 0.75rem;border-radius:99px;font-size:0.78rem;font-weight:700;background:${statusBg};color:${statusColor}">
                        <i class="fa-solid ${icon}"></i>${c.kycStatus}</span></td>
                    <td style="display:flex;gap:0.5rem">
                        ${c.kycStatus === 'PENDING' ? `
                            <button class="btn-approve" style="font-size:0.78rem;padding:0.35rem 0.75rem" onclick="app.setKycStatus(${c.Cust_ID},'VERIFIED')"><i class="fa-solid fa-check"></i> Verify</button>
                            <button class="btn-reject" style="font-size:0.78rem;padding:0.35rem 0.75rem" onclick="app.setKycStatus(${c.Cust_ID},'REJECTED')"><i class="fa-solid fa-xmark"></i> Reject</button>
                        ` : ''}
                        <button class="btn-review" style="font-size:0.78rem;padding:0.35rem 0.75rem" onclick="app.showKycDetailModal(${c.Cust_ID})"><i class="fa-solid fa-eye"></i> View</button>
                    </td></tr>`;
            }).join('')}</tbody></table>`;
    }

    filterKycTable() {
        if (!this._kycData) return;
        const q      = (document.getElementById('kyc-search')?.value||'').toLowerCase();
        const status = document.getElementById('kyc-status-filter')?.value||'ALL';
        const filtered = this._kycData.filter(c => {
            const matchQ = !q || `${c.FName} ${c.LName||''} ${c.Email||''}`.toLowerCase().includes(q);
            const matchS = status==='ALL' || c.kycStatus===status;
            return matchQ && matchS;
        });
        this._renderKycTable(filtered);
    }

    async setKycStatus(custId, status) {
        if (!this._kycData) return;
        try {
            await fetch(`${this.api}/customers/${custId}/kyc`, {
                method: 'PATCH',
                headers: this.getHeaders(),
                body: JSON.stringify({ kycStatus: status })
            });
            this._kycData = this._kycData.map(c => c.Cust_ID===custId ? {...c, kycStatus: status} : c);
            document.getElementById('kyc-verified').textContent  = this._kycData.filter(c=>c.kycStatus==='VERIFIED').length;
            document.getElementById('kyc-pending').textContent   = this._kycData.filter(c=>c.kycStatus==='PENDING').length;
            document.getElementById('kyc-rejected').textContent  = this._kycData.filter(c=>c.kycStatus==='REJECTED').length;
            this.filterKycTable();
        } catch(e) { this.toast('Error updating KYC: ' + e.message, 'error'); }
    }

    showKycDetailModal(custId) {
        const c = this._kycData?.find(x => x.Cust_ID===custId);
        if (!c) return;
        const old = document.getElementById('kycDetailModal'); if(old) old.remove();
        const ov = document.createElement('div');
        ov.id = 'kycDetailModal';
        ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem;backdrop-filter:blur(4px)';
        ov.innerHTML = `<div style="background:var(--card);border:1px solid var(--border);border-radius:20px;padding:2rem;width:100%;max-width:480px;animation:authFadeIn 0.3s ease-out">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem">
                <h3 style="font-size:1.2rem;font-weight:800;color:var(--text)"><i class="fa-solid fa-id-card" style="color:var(--gold2);margin-right:0.5rem"></i>KYC Document Review</h3>
                <button onclick="document.getElementById('kycDetailModal').remove()" style="background:none;border:none;color:var(--text3);font-size:1.2rem;cursor:pointer">✕</button>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem">
                <div><div style="font-size:0.7rem;font-weight:700;letter-spacing:1px;color:var(--text3);text-transform:uppercase;margin-bottom:0.25rem">Full Name</div><div style="font-weight:600;color:var(--text)">${c.FName} ${c.LName||''}</div></div>
                <div><div style="font-size:0.7rem;font-weight:700;letter-spacing:1px;color:var(--text3);text-transform:uppercase;margin-bottom:0.25rem">Customer ID</div><div style="font-weight:600;color:var(--text)">CUST${String(c.Cust_ID).padStart(4,'0')}</div></div>
                <div><div style="font-size:0.7rem;font-weight:700;letter-spacing:1px;color:var(--text3);text-transform:uppercase;margin-bottom:0.25rem">Email</div><div style="color:var(--text)">${c.Email||'—'}</div></div>
                <div><div style="font-size:0.7rem;font-weight:700;letter-spacing:1px;color:var(--text3);text-transform:uppercase;margin-bottom:0.25rem">Mobile</div><div style="color:var(--text)">${c.ContactNo||'—'}</div></div>
                <div><div style="font-size:0.7rem;font-weight:700;letter-spacing:1px;color:var(--text3);text-transform:uppercase;margin-bottom:0.25rem">Date of Birth</div><div style="color:var(--text)">${c.CustDOB ? new Date(c.CustDOB).toLocaleDateString() : '—'}</div></div>
                <div><div style="font-size:0.7rem;font-weight:700;letter-spacing:1px;color:var(--text3);text-transform:uppercase;margin-bottom:0.25rem">ID Proof Type</div><div style="color:var(--text)">${c.CustIDProofType||'AADHAAR'}</div></div>
                <div><div style="font-size:0.7rem;font-weight:700;letter-spacing:1px;color:var(--text3);text-transform:uppercase;margin-bottom:0.25rem">PAN / Tax ID</div><div style="color:var(--text)">${c.TaxID||'—'}</div></div>
                <div><div style="font-size:0.7rem;font-weight:700;letter-spacing:1px;color:var(--text3);text-transform:uppercase;margin-bottom:0.25rem">Customer Type</div><div style="color:var(--text)">${c.CustomerType||'INDIVIDUAL'}</div></div>
            </div>
            <div style="background:var(--bg2);border-radius:10px;padding:1rem;margin-bottom:1.5rem;font-size:0.85rem;color:var(--text3)">
                <i class="fa-solid fa-circle-info" style="color:var(--gold2);margin-right:0.4rem"></i>
                KYC verification confirms identity documents match bank records. Once verified, the customer gains full banking privileges.
            </div>
            <div style="display:flex;gap:0.75rem">
                <button onclick="app.setKycStatus(${c.Cust_ID},'VERIFIED');document.getElementById('kycDetailModal').remove()" class="btn-approve" style="flex:1"><i class="fa-solid fa-check"></i> Mark Verified</button>
                <button onclick="app.setKycStatus(${c.Cust_ID},'REJECTED');document.getElementById('kycDetailModal').remove()" class="btn-reject" style="flex:1"><i class="fa-solid fa-xmark"></i> Reject</button>
            </div></div>`;
        document.body.appendChild(ov);
    }

    showTxnReviewModal(txnId, type, amount, name, acctNo, method, date, desc) {
        const old = document.getElementById('txnReviewModal'); if(old) old.remove();
        const ov = document.createElement('div');
        ov.id = 'txnReviewModal';
        ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem;backdrop-filter:blur(4px)';
        ov.innerHTML = `<div style="background:var(--card);border:1px solid var(--border);border-radius:20px;padding:2rem;width:100%;max-width:500px;animation:authFadeIn 0.3s ease-out;max-height:90vh;overflow-y:auto">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem">
                <h3 style="font-size:1.2rem;font-weight:800;color:var(--text)"><i class="fa-solid fa-receipt" style="color:var(--gold2);margin-right:0.5rem"></i>Transaction Details</h3>
                <button onclick="document.getElementById('txnReviewModal').remove()" style="background:none;border:none;color:var(--text3);font-size:1.2rem;cursor:pointer">✕</button>
            </div>
            <div style="background:var(--bg2);border-radius:10px;padding:1.5rem;margin-bottom:1rem;text-align:center">
                <div style="font-size:0.8rem;font-weight:700;letter-spacing:1px;color:var(--text3);text-transform:uppercase;margin-bottom:0.5rem">Amount ${type==='CREDIT'?'Credited':'Debited'}</div>
                <div style="font-size:2.5rem;font-weight:800;color:${type==='CREDIT'?'var(--green)':'var(--text)'}">${type==='CREDIT'?'+':'-'}₹${this.fmt(amount)}</div>
                <div style="color:var(--text2);font-size:0.9rem;margin-top:0.5rem;display:inline-block;padding:0.25rem 0.75rem;background:var(--bg3);border-radius:20px">${type} &nbsp;|&nbsp; ${method}</div>
            </div>
            
            <div style="display:grid;grid-template-columns:1fr;gap:1rem;background:var(--bg3);padding:1.5rem;border-radius:12px">
                <div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--border);padding-bottom:0.75rem">
                    <span style="color:var(--text3);font-size:0.85rem">Transaction ID</span>
                    <span style="font-weight:600;color:var(--text)">#${txnId}</span>
                </div>
                <div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--border);padding-bottom:0.75rem">
                    <span style="color:var(--text3);font-size:0.85rem">Date & Time</span>
                    <span style="font-weight:600;color:var(--text)">${new Date(date).toLocaleString()}</span>
                </div>
                <div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--border);padding-bottom:0.75rem">
                    <span style="color:var(--text3);font-size:0.85rem">Account Number</span>
                    <span style="font-weight:600;color:var(--text)">${acctNo}</span>
                </div>
                <div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--border);padding-bottom:0.75rem">
                    <span style="color:var(--text3);font-size:0.85rem">Account Holder</span>
                    <span style="font-weight:600;color:var(--text)">${name}</span>
                </div>
                <div style="display:flex;justify-content:space-between">
                    <span style="color:var(--text3);font-size:0.85rem">Description</span>
                    <span style="font-weight:600;color:var(--text);text-align:right">${desc}</span>
                </div>
            </div>
            
            <div style="margin-top:2rem;text-align:center">
                <button onclick="document.getElementById('txnReviewModal').remove()" style="background:var(--gold1);color:#000;border:none;padding:0.75rem 2rem;border-radius:8px;font-weight:700;cursor:pointer;width:100%;transition:transform 0.2s">Close</button>
            </div>
        </div>`;
        document.body.appendChild(ov);
    }


    showCustReviewModal(custId, fName, lName, email, contact, taxId, type, kyc) {
        const old = document.getElementById('custReviewModal'); if(old) old.remove();
        const ov = document.createElement('div');
        ov.id = 'custReviewModal';
        ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem;backdrop-filter:blur(4px)';
        ov.innerHTML = `<div style="background:var(--card);border:1px solid var(--border);border-radius:20px;padding:2rem;width:100%;max-width:500px;animation:authFadeIn 0.3s ease-out;max-height:90vh;overflow-y:auto">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem">
                <h3 style="font-size:1.2rem;font-weight:800;color:var(--text)"><i class="fa-solid fa-user" style="color:var(--gold2);margin-right:0.5rem"></i>Customer Profile</h3>
                <button onclick="document.getElementById('custReviewModal').remove()" style="background:none;border:none;color:var(--text3);font-size:1.2rem;cursor:pointer">✕</button>
            </div>
            <div style="display:grid;grid-template-columns:1fr;gap:1rem;background:var(--bg3);padding:1.5rem;border-radius:12px">
                <div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--border);padding-bottom:0.75rem">
                    <span style="color:var(--text3);font-size:0.85rem">Customer ID</span>
                    <span style="font-weight:600;color:var(--text)">CUST${String(custId).padStart(4,'0')}</span>
                </div>
                <div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--border);padding-bottom:0.75rem">
                    <span style="color:var(--text3);font-size:0.85rem">Name</span>
                    <span style="font-weight:600;color:var(--text)">${fName} ${lName}</span>
                </div>
                <div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--border);padding-bottom:0.75rem">
                    <span style="color:var(--text3);font-size:0.85rem">Email</span>
                    <span style="font-weight:600;color:var(--text)">${email || 'N/A'}</span>
                </div>
                <div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--border);padding-bottom:0.75rem">
                    <span style="color:var(--text3);font-size:0.85rem">Contact Number</span>
                    <span style="font-weight:600;color:var(--text)">${contact || 'N/A'}</span>
                </div>
                <div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--border);padding-bottom:0.75rem">
                    <span style="color:var(--text3);font-size:0.85rem">Tax ID (PAN)</span>
                    <span style="font-weight:600;color:var(--text)">${taxId || 'N/A'}</span>
                </div>
                <div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--border);padding-bottom:0.75rem">
                    <span style="color:var(--text3);font-size:0.85rem">Account Type</span>
                    <span style="font-weight:600;color:var(--text)">${type}</span>
                </div>
                <div style="display:flex;justify-content:space-between">
                    <span style="color:var(--text3);font-size:0.85rem">KYC Status</span>
                    <span style="font-weight:600;color:${kyc==='VERIFIED'?'var(--green)':'var(--gold2)'}">${kyc}</span>
                </div>
            </div>
            <div style="margin-top:2rem;text-align:center">
                <button onclick="document.getElementById('custReviewModal').remove()" style="background:var(--gold1);color:#000;border:none;padding:0.75rem 2rem;border-radius:8px;font-weight:700;cursor:pointer;width:100%;transition:transform 0.2s">Close</button>
            </div>
        </div>`;
        document.body.appendChild(ov);
    }

    showAcctReviewModal(acctNo, name, custId, type, balance) {
        const old = document.getElementById('acctReviewModal'); if(old) old.remove();
        const ov = document.createElement('div');
        ov.id = 'acctReviewModal';
        ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem;backdrop-filter:blur(4px)';
        ov.innerHTML = `<div style="background:var(--card);border:1px solid var(--border);border-radius:20px;padding:2rem;width:100%;max-width:500px;animation:authFadeIn 0.3s ease-out;max-height:90vh;overflow-y:auto">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem">
                <h3 style="font-size:1.2rem;font-weight:800;color:var(--text)"><i class="fa-solid fa-building-columns" style="color:var(--gold2);margin-right:0.5rem"></i>Account Details</h3>
                <button onclick="document.getElementById('acctReviewModal').remove()" style="background:none;border:none;color:var(--text3);font-size:1.2rem;cursor:pointer">✕</button>
            </div>
            <div style="background:var(--bg2);border-radius:10px;padding:1.5rem;margin-bottom:1rem;text-align:center">
                <div style="font-size:0.8rem;font-weight:700;letter-spacing:1px;color:var(--text3);text-transform:uppercase;margin-bottom:0.5rem">Available Balance</div>
                <div style="font-size:2.5rem;font-weight:800;color:var(--green)">₹${this.fmt(balance)}</div>
            </div>
            <div style="display:grid;grid-template-columns:1fr;gap:1rem;background:var(--bg3);padding:1.5rem;border-radius:12px">
                <div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--border);padding-bottom:0.75rem">
                    <span style="color:var(--text3);font-size:0.85rem">Account Number</span>
                    <span style="font-weight:600;color:var(--text);font-family:monospace">${acctNo}</span>
                </div>
                <div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--border);padding-bottom:0.75rem">
                    <span style="color:var(--text3);font-size:0.85rem">Account Type</span>
                    <span style="font-weight:600;color:var(--text)">${type}</span>
                </div>
                <div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--border);padding-bottom:0.75rem">
                    <span style="color:var(--text3);font-size:0.85rem">Account Holder</span>
                    <span style="font-weight:600;color:var(--text)">${name}</span>
                </div>
                <div style="display:flex;justify-content:space-between">
                    <span style="color:var(--text3);font-size:0.85rem">Customer ID</span>
                    <span style="font-weight:600;color:var(--text)">CUST${String(custId).padStart(4,'0')}</span>
                </div>
            </div>
            <div style="margin-top:2rem;text-align:center">
                <button onclick="document.getElementById('acctReviewModal').remove()" style="background:var(--gold1);color:#000;border:none;padding:0.75rem 2rem;border-radius:8px;font-weight:700;cursor:pointer;width:100%;transition:transform 0.2s">Close</button>
            </div>
        </div>`;
        document.body.appendChild(ov);
    }

    showLoanReviewModal(loanId, custName, loanType, amount, rate, tenure, createdAt) {
        const old = document.getElementById('loanReviewModal'); if(old) old.remove();
        const emi = amount && rate && tenure ? ((amount * (rate/1200) * Math.pow(1+rate/1200, tenure)) / (Math.pow(1+rate/1200, tenure)-1)).toFixed(0) : 0;
        const totalPay = emi * tenure;
        const totalInt = totalPay - amount;
        const ov = document.createElement('div');
        ov.id = 'loanReviewModal';
        ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem;backdrop-filter:blur(4px)';
        ov.innerHTML = `<div style="background:var(--card);border:1px solid var(--border);border-radius:20px;padding:2rem;width:100%;max-width:500px;animation:authFadeIn 0.3s ease-out;max-height:90vh;overflow-y:auto">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem">
                <h3 style="font-size:1.2rem;font-weight:800;color:var(--text)"><i class="fa-solid fa-file-contract" style="color:var(--gold2);margin-right:0.5rem"></i>Loan Full Review</h3>
                <button onclick="document.getElementById('loanReviewModal').remove()" style="background:none;border:none;color:var(--text3);font-size:1.2rem;cursor:pointer">✕</button>
            </div>
            <div style="background:var(--bg2);border-radius:10px;padding:1rem;margin-bottom:1rem">
                <div style="font-size:0.7rem;font-weight:700;letter-spacing:1px;color:var(--text3);text-transform:uppercase;margin-bottom:0.5rem">Application Reference</div>
                <div style="font-size:1.1rem;font-weight:800;color:var(--gold2)">LN${String(loanId).padStart(4,'0')}</div>
                <div style="color:var(--text2);font-size:0.85rem;margin-top:0.2rem">Applicant: ${custName} &nbsp;|&nbsp; Type: ${loanType} &nbsp;|&nbsp; Applied: ${createdAt ? new Date(createdAt).toLocaleDateString() : 'N/A'}</div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem">
                <div style="background:var(--bg2);border-radius:10px;padding:1rem;text-align:center">
                    <div style="font-size:0.7rem;font-weight:700;letter-spacing:1px;color:var(--text3);text-transform:uppercase;margin-bottom:0.4rem">Loan Amount</div>
                    <div style="font-size:1.3rem;font-weight:900;color:var(--text)">₹${this.fmt(amount)}</div></div>
                <div style="background:var(--bg2);border-radius:10px;padding:1rem;text-align:center">
                    <div style="font-size:0.7rem;font-weight:700;letter-spacing:1px;color:var(--text3);text-transform:uppercase;margin-bottom:0.4rem">Interest Rate</div>
                    <div style="font-size:1.3rem;font-weight:900;color:var(--text)">${rate}% p.a.</div></div>
                <div style="background:var(--bg2);border-radius:10px;padding:1rem;text-align:center">
                    <div style="font-size:0.7rem;font-weight:700;letter-spacing:1px;color:var(--text3);text-transform:uppercase;margin-bottom:0.4rem">Tenure</div>
                    <div style="font-size:1.3rem;font-weight:900;color:var(--text)">${tenure} months</div></div>
                <div style="background:var(--bg2);border-radius:10px;padding:1rem;text-align:center">
                    <div style="font-size:0.7rem;font-weight:700;letter-spacing:1px;color:var(--text3);text-transform:uppercase;margin-bottom:0.4rem">Monthly EMI</div>
                    <div style="font-size:1.3rem;font-weight:900;color:#16a34a">₹${this.fmt(emi)}</div></div>
            </div>
            <div style="background:rgba(240,192,64,0.08);border:1px solid var(--gold2);border-radius:10px;padding:1rem;margin-bottom:1.5rem">
                <div style="display:flex;justify-content:space-between;font-size:0.88rem;color:var(--text2);margin-bottom:0.4rem"><span>Total Repayment</span><span style="font-weight:700;color:var(--text)">₹${this.fmt(totalPay)}</span></div>
                <div style="display:flex;justify-content:space-between;font-size:0.88rem;color:var(--text2)"><span>Total Interest Charged</span><span style="font-weight:700;color:#dc2626">₹${this.fmt(totalInt)}</span></div>
            </div>
            <div style="display:flex;gap:0.75rem">
                <button onclick="app.updateApprovalStatus('loan',${loanId},'APPROVED');document.getElementById('loanReviewModal').remove()" class="btn-approve" style="flex:1"><i class="fa-solid fa-check"></i> Approve</button>
                <button onclick="app.updateApprovalStatus('loan',${loanId},'REJECTED');document.getElementById('loanReviewModal').remove()" class="btn-reject" style="flex:1"><i class="fa-solid fa-xmark"></i> Reject</button>
                <button onclick="document.getElementById('loanReviewModal').remove()" class="btn-review" style="flex:1">Close</button>
            </div></div>`;
        document.body.appendChild(ov);
    }

    async renderEmpEmployees() {
        const el = document.getElementById('emp-main-content');
        el.innerHTML = `<div class="emp-dash-header" style="margin-bottom:1rem">
            <div><h2 class="emp-dash-title">Employee Registry</h2><p class="emp-dash-sub">All NexaBank staff and their details</p></div>
            <div style="display:flex;gap:0.5rem;align-items:center">
                <button class="btn-auth-submit" onclick="app.showAddEmpModal()"><i class="fa-solid fa-user-plus"></i> Add Employee</button>
                <button class="btn-auth-outline theme-icon-btn" onclick="app.cycleTheme()"><i class="fa-solid fa-circle-half-stroke"></i></button>
            </div>
        </div>
        <div class="registry-toolbar">
            <div class="registry-search" style="flex:1;min-width:200px"><i class="fa-solid fa-magnifying-glass" style="color:var(--text3)"></i>
                <input type="text" id="emp-search" placeholder="Search by name, email, role..." oninput="app.filterEmpTable()"></div>
            <select class="registry-filter" id="emp-dept-filter" onchange="app.filterEmpTable()">
                <option value="ALL">All Departments</option>
                <option value="Technology">Technology</option>
                <option value="Loans">Loans &amp; Credit</option>
                <option value="Customer">Customer Relations</option>
                <option value="Management">Management</option>
                <option value="Compliance">Compliance &amp; KYC</option>
                <option value="Finance">Finance &amp; Accounts</option>
                <option value="Operations">Operations</option>
                <option value="Risk">Risk Management</option>
            </select>
        </div>
        <div class="registry-table-wrap" id="emp-table-wrap"><p class="loading-text"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</p></div>`;

        try {
            const res = await fetch(`${this.api}/employees`, { headers: this.getHeaders() });
            const emps = await res.json();
            this._empData = emps;
            this._renderEmpTable(emps);
        } catch(e) {
            document.getElementById('emp-table-wrap').innerHTML = '<p class="error-text">Failed to load employee data.</p>';
        }
    }

    _renderEmpTable(data) {
        const wrap = document.getElementById('emp-table-wrap');
        if (!wrap) return;
        if (!data.length) { wrap.innerHTML = '<p class="error-text" style="padding:1rem">No employees found.</p>'; return; }
        wrap.innerHTML = `<table class="registry-table">
            <thead><tr>
                <th>#</th><th>EMP ID</th><th>Name</th><th>Email</th><th>Department</th>
                <th>Role</th><th>Salary</th><th>Joined</th><th>Actions</th>
            </tr></thead>
            <tbody>${data.map((e, i) => `<tr>
                <td style="color:var(--text3)">${i + 1}</td>
                <td style="font-family:monospace;font-weight:700;color:var(--gold2)">EMP${String(e.EID).padStart(3,'0')}</td>
                <td><strong>${e.Name} ${e.LName||''}</strong><br><span style="font-size:0.75rem;color:var(--text3)">${e.City||''}</span></td>
                <td style="color:var(--text2);font-size:0.85rem">${e.Email || '—'}</td>
                <td><span style="display:inline-block;padding:0.2rem 0.6rem;background:rgba(240,192,64,0.12);color:var(--gold2);border-radius:6px;font-size:0.75rem;font-weight:700">${e.D_und || '—'}</span></td>
                <td style="font-size:0.85rem;color:var(--text2)">${e.Responsibility || '—'}</td>
                <td style="color:var(--green);font-weight:700">₹${this.fmt(e.Salary)}</td>
                <td style="color:var(--text3);font-size:0.82rem">${e.JoinedDate ? new Date(e.JoinedDate).toLocaleDateString('en-IN',{year:'numeric',month:'short'}) : '—'}</td>
                <td><div class="sli-actions">
                    <button class="btn-review" style="padding:0.25rem 0.5rem" onclick="app.showEditEmpModal(${e.EID})"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-review" style="padding:0.25rem 0.5rem;color:#dc2626;border-color:#fecaca;background:#fef2f2" onclick="app.deleteEmployee(${e.EID})"><i class="fa-solid fa-trash"></i></button>
                </div></td>
            </tr>`).join('')}</tbody>
        </table>`;
    }

    filterEmpTable() {
        if (!this._empData) return;
        const q    = (document.getElementById('emp-search')?.value || '').toLowerCase();
        const dept = document.getElementById('emp-dept-filter')?.value || 'ALL';
        const filtered = this._empData.filter(e => {
            const matchQ = !q || `${e.Name} ${e.LName||''} ${e.Email||''} ${e.Responsibility||''}`.toLowerCase().includes(q);
            const matchD = dept === 'ALL' || (e.D_und||'').includes(dept);
            return matchQ && matchD;
        });
        this._renderEmpTable(filtered);
    }

    _empModalHTML(title, emp = {}) {
        const depts = ['Technology','Loans & Credit','Customer Relations','Management','Compliance & KYC','Finance & Accounts','Operations','Risk Management'];
        return `
        <div class="nexa-modal" style="max-width:550px">
            <div class="nexa-modal-header">
                <div class="nexa-modal-icon" style="background:rgba(59,130,246,0.12)"><i class="fa-solid fa-user-tie" style="color:#3b82f6"></i></div>
                <div><div class="nexa-modal-title">${title}</div><div class="nexa-modal-sub">Fill in the employee details below</div></div>
                <button class="nexa-modal-close" onclick="this.closest('.nexa-modal-overlay').remove()"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-top:1rem">
                <div class="nexa-modal-field"><label>FIRST NAME *</label><input id="emp-f-name" class="nexa-modal-input" value="${emp.Name||''}" required></div>
                <div class="nexa-modal-field"><label>LAST NAME</label><input id="emp-l-name" class="nexa-modal-input" value="${emp.LName||''}"></div>
                <div class="nexa-modal-field"><label>EMAIL *</label><input id="emp-email" class="nexa-modal-input" type="email" value="${emp.Email||''}" required></div>
                <div class="nexa-modal-field"><label>CONTACT NO</label><input id="emp-contact" class="nexa-modal-input" value="${emp.ContactNo||''}"></div>
                <div class="nexa-modal-field"><label>CITY</label><input id="emp-city" class="nexa-modal-input" value="${emp.City||''}"></div>
                <div class="nexa-modal-field"><label>SALARY (₹)</label><input id="emp-salary" class="nexa-modal-input" type="number" value="${emp.Salary||''}"></div>
                <div class="nexa-modal-field"><label>DEPARTMENT</label>
                    <select id="emp-dept" class="nexa-modal-input">${depts.map(d=>`<option ${(emp.D_und||'')==d?'selected':''}>${d}</option>`).join('')}</select>
                </div>
                <div class="nexa-modal-field"><label>ROLE / RESPONSIBILITY</label><input id="emp-role" class="nexa-modal-input" value="${emp.Responsibility||''}"></div>
            </div>
            <div style="display:flex;gap:1rem;margin-top:1.5rem">
                <button class="btn-auth-outline" style="flex:1" onclick="this.closest('.nexa-modal-overlay').remove()">Cancel</button>
                <button class="btn-auth-submit" style="flex:1" id="emp-save-btn" onclick="app._submitEmpForm(${emp.EID || 0})">${emp.EID ? 'Save Changes' : 'Add Employee'}</button>
            </div>
        </div>`;
    }

    showAddEmpModal() {
        const old = document.getElementById('empModal'); if(old) old.remove();
        const ov = document.createElement('div');
        ov.className = 'nexa-modal-overlay';
        ov.id = 'empModal';
        ov.innerHTML = this._empModalHTML('Add New Employee');
        document.body.appendChild(ov);
        setTimeout(() => ov.classList.add('active'), 10);
    }

    showEditEmpModal(eid) {
        const emp = this._empData?.find(e => e.EID === eid);
        if (!emp) return;
        const old = document.getElementById('empModal'); if(old) old.remove();
        const ov = document.createElement('div');
        ov.className = 'nexa-modal-overlay';
        ov.id = 'empModal';
        ov.innerHTML = this._empModalHTML(`Edit Employee — EMP${String(eid).padStart(3,'0')}`, emp);
        document.body.appendChild(ov);
        setTimeout(() => ov.classList.add('active'), 10);
    }

    async _submitEmpForm(eid) {
        const body = {
            Name: document.getElementById('emp-f-name').value.trim(),
            LName: document.getElementById('emp-l-name').value.trim(),
            Email: document.getElementById('emp-email').value.trim(),
            ContactNo: document.getElementById('emp-contact').value.trim(),
            City: document.getElementById('emp-city').value.trim(),
            Salary: parseFloat(document.getElementById('emp-salary').value) || 0,
            D_und: document.getElementById('emp-dept').value,
            Responsibility: document.getElementById('emp-role').value.trim()
        };
        if (!body.Name || !body.Email) { this.toast('Name and Email are required.', 'error'); return; }

        try {
            const method = eid ? 'PUT' : 'POST';
            const url = eid ? `${this.api}/employees/${eid}` : `${this.api}/employees`;
            const res = await fetch(url, { method, headers: this.getHeaders(), body: JSON.stringify(body) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Operation failed');
            this.toast(eid ? 'Employee updated!' : 'Employee added!', 'success');
            document.getElementById('empModal').remove();
            this.renderEmpEmployees();
        } catch(e) { this.toast(e.message, 'error'); }
    }

    async deleteEmployee(eid) {
        if (!confirm(`Delete EMP${String(eid).padStart(3,'0')}? This cannot be undone.`)) return;
        try {
            const res = await fetch(`${this.api}/employees/${eid}`, { method: 'DELETE', headers: this.getHeaders() });
            if (!res.ok) throw new Error('Delete failed');
            this.toast('Employee removed.', 'success');
            this.renderEmpEmployees();
        } catch(e) { this.toast(e.message, 'error'); }
    }

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
        } catch(e) { this.toast(e.message, 'error'); }
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
                            <p class="approval-sub">${l.PickupLocation || 'Personal Loan'} · Acct: ${l.Account_No || 'N/A'} · Submitted: ${l.CreatedAt ? new Date(l.CreatedAt).toLocaleDateString() : 'N/A'}</p>
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
                            <button class="btn-review" onclick="app.showLoanReviewModal(${l.LoanID}, '${(l.CustName||'Customer').replace(/'/g,``)}', '${l.PickupLocation||'Personal'}', ${l.Requested_Amount||0}, ${l.LoanRate||8.5}, ${l.TenureMonths||36}, '${l.CreatedAt||''}')"><i class="fa-solid fa-magnifying-glass"></i> Full Review</button>
                        ` : `
                            <button class="btn-review" onclick="app.showLoanReviewModal(${l.LoanID}, '${(l.CustName||'Customer').replace(/'/g,``)}', '${l.PickupLocation||'Personal'}', ${l.Requested_Amount||0}, ${l.LoanRate||8.5}, ${l.TenureMonths||36}, '${l.CreatedAt||''}')"><i class="fa-solid fa-magnifying-glass"></i> Full Review</button>
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
                <thead><tr><th>Card ID</th><th>Customer Details</th><th>Account No</th><th>Type</th><th>Income</th><th>Status</th><th>Action</th></tr></thead><tbody>`;
            cards.forEach(c => {
                const s = c.ApprovalStatus || 'PENDING';
                const statusBadge = s === 'APPROVED' ? 'badge-green' : s === 'REJECTED' ? 'badge-red' : 'badge-gold';
                html += `<tr>
                    <td>#${c.CardID}</td>
                    <td>
                        <div style="font-weight:600">${c.CustName || `CUST${c.Cust_ID}`}</div>
                        <div style="font-size:0.8rem; color:var(--text3)">
                            ${c.Email || 'No Email'} • ${c.ContactNo || 'No Phone'}<br>
                            PAN: ${c.TaxID || 'N/A'}
                        </div>
                    </td>
                    <td>${c.Account_No || 'N/A'}</td>
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
            const init = (data.Name||data.FName||this.userName||'U').charAt(0).toUpperCase();
            const fullName = `${data.Name||data.FName||''} ${data.LName||''}`.trim();
            
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
                    ${this.userType === 'employee' ? `
                    <div class="health-card">
                        <div class="health-card-title" style="margin-bottom:1rem"><i class="fa-solid fa-briefcase" style="color:var(--gold2);margin-right:0.5rem"></i>Employment Details</div>
                        <div class="health-row" style="margin-bottom:0.75rem"><span class="health-lbl">Employee ID</span><span class="health-val" style="font-weight:700;font-family:monospace">EMP${String(data.EID||this.userId).padStart(4,'0')}</span></div>
                        <div class="health-row" style="margin-bottom:0.75rem"><span class="health-lbl">Department</span><span class="health-val">${data.D_und || 'Administration'}</span></div>
                        <div class="health-row" style="margin-bottom:0.75rem"><span class="health-lbl">Role</span><span class="health-val">${data.Responsibility || 'Staff'}</span></div>
                        <div class="health-row" style="margin-bottom:0.75rem"><span class="health-lbl">Joined Date</span><span class="health-val">${data.JoinedDate ? new Date(data.JoinedDate).toLocaleDateString() : 'N/A'}</span></div>
                        <div class="health-row" style="margin-bottom:0.75rem"><span class="health-lbl">Base Salary</span><span class="health-val" style="color:var(--green);font-weight:800">₹${this.fmt(data.Salary || 0)}</span></div>
                    </div>
                    ` : `
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
                    `}
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
            this.toast('Your account has been permanently deleted.', 'error');
            this.logout();
        } catch (err) {
            this.toast('Could not delete account: ' + err.message, 'error');
        }
    }
}

const app = new NexaBank();
