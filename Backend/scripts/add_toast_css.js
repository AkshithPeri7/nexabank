const fs = require('fs');
let css = fs.readFileSync('Frontend/styles.css', 'utf8');
if(!css.includes('#toast-container')) {
    css += `\n/* ===== TOAST NOTIFICATIONS ===== */
#toast-container {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 99999;
    display: flex;
    flex-direction: column;
    gap: 10px;
    pointer-events: none;
}
.nx-toast {
    background: var(--card);
    border: 1px solid var(--border);
    border-left: 4px solid var(--gold2);
    color: var(--text);
    padding: 16px 20px;
    border-radius: 8px;
    box-shadow: var(--shadow);
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 300px;
    max-width: 400px;
    font-weight: 500;
    font-size: 0.95rem;
    animation: toastSlideIn 0.3s ease-out forwards;
    pointer-events: auto;
}
.nx-toast.error { border-left-color: var(--red); }
.nx-toast.success { border-left-color: var(--green); }
.nx-toast-icon { font-size: 1.2rem; }
.nx-toast.error .nx-toast-icon { color: var(--red); }
.nx-toast.success .nx-toast-icon { color: var(--green); }
.nx-toast.info .nx-toast-icon { color: var(--gold2); }
.nx-toast-close {
    margin-left: auto;
    background: none;
    border: none;
    color: var(--text3);
    cursor: pointer;
    padding: 4px;
}
.nx-toast-close:hover { color: var(--text); }
@keyframes toastSlideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}
@keyframes toastSlideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
}
`;
    fs.writeFileSync('Frontend/styles.css', css);
}
