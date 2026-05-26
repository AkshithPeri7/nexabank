const fs = require('fs');
let app = fs.readFileSync('Frontend/app.js', 'utf8');

if(!app.includes('toast(message')) {
    const toastMethod = `
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
        
        toast.innerHTML = \`<i class="fa-solid \${icon} nx-toast-icon"></i>
            <div style="flex:1">\${message}</div>
            <button class="nx-toast-close" onclick="this.parentElement.remove()"><i class="fa-solid fa-xmark"></i></button>\`;
            
        container.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentElement) {
                toast.style.animation = 'toastSlideOut 0.3s ease-in forwards';
                setTimeout(() => toast.remove(), 300);
            }
        }, 4000);
    }
`;
    app = app.replace('init() {', toastMethod + '\n    init() {');
}

app = app.replace(/alert\((.*?)\);/g, "this.toast($1, 'error');");
app = app.replace(/this\.toast\('✅ Transfer successful!', 'error'\);/g, "this.toast('Transfer successful!', 'success');");
app = app.replace(/this\.toast\('✅ Loan application submitted!', 'error'\);/g, "this.toast('Loan application submitted!', 'success');");

fs.writeFileSync('Frontend/app.js', app);
console.log('App.js updated with toast');
