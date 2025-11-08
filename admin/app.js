import { API_URL } from './config.js';
import { state } from './state.js';
import { initializeAuth, resetInactivityTimer } from './auth.js';
import { showView, toggleSuperAdminFeatures } from './ui.js';
import { initializeDashboard } from './modules/dashboard.js';
import { initializeGroups } from './modules/groups.js';
import { initializeLearners } from './modules/learners.js';
import { initializeMaterials } from './modules/materials.js';
import { initializeAdmins } from './modules/admins.js';
import { initializeAudit } from './modules/audit.js';
import { initializeBackups } from './modules/backups.js';
import { initializeSettings } from './modules/settings.js';
import { initializeGroupEditor } from './modules/groupEditor.js';

export function initializeApp() {
    showView('dashboard-container');
    toggleSuperAdminFeatures(state.userRole);
    resetInactivityTimer();

    initializeDashboard();
    initializeGroups();
    initializeLearners();
    initializeMaterials();
    initializeAdmins();
    initializeAudit();
    initializeBackups();
    initializeSettings();
    initializeGroupEditor();
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch(`${API_URL}/api/settings/maintenance`);
        if (response.ok) {
            const data = await response.json();
            const banner = document.getElementById('maintenance-banner');
            if (banner) {
                banner.classList.toggle('hidden', !data.enabled);
            }
        }
    } catch (e) {
        console.error("Не удалось проверить статус режима тестирования");
    }

    initializeAuth();
    if (state.token) {
        initializeApp();
    } else {
        showView('admin-login-view-container');
    }
});