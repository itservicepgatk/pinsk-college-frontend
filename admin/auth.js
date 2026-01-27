import { DOMElements } from './dom.js';
import * as api from './api.js';
import * as ui from './ui.js';
import { updateState } from './state.js';
import { initializeApp } from './app.js';

let inactivityTimer = null;

function handleMaintenanceBanner(enabled) {
    const banner = document.getElementById('maintenance-banner');
    if (banner) {
        banner.classList.toggle('visible', enabled);
        document.body.classList.toggle('maintenance-active', enabled);
    }
}

export function resetInactivityTimer() {
    if (inactivityTimer) clearTimeout(inactivityTimer);
}

async function handleLogin(event) {
    event.preventDefault();
    DOMElements.adminErrorMessage.textContent = '';
    DOMElements.adminLoader.classList.remove('hidden');
    const login = DOMElements.adminLoginForm.elements['admin-login'].value;
    const password = DOMElements.adminLoginForm.elements['admin-password'].value;

    try {
        const response = await api.adminLogin(login, password);
        if (!response.ok) {
            const err = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(err.message);
        }
        const data = await response.json();
        updateState({ token: data.token, userRole: data.role });
        localStorage.setItem('adminToken', data.token);
        localStorage.setItem('adminRole', data.role);
        
        handleMaintenanceBanner(data.maintenanceMode);
        initializeApp();
    } catch (error) {
        DOMElements.adminErrorMessage.textContent = error.message;
    } finally {
        DOMElements.adminLoader.classList.add('hidden');
    }
}

async function logout(reason = 'Ручной выход') {
    try {
        if (localStorage.getItem('adminToken')) {
            await api.logLogout({ reason });
        }
    } catch (error) {
        console.error('Не удалось записать лог о выходе:', error);
    }
    
    updateState({ token: null, userRole: null });
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminRole');
    ui.toggleSuperAdminFeatures(null);
    window.location.href = 'index.html';
}

export function initializeAuth() {
    if (DOMElements.adminLoginForm) {
        DOMElements.adminLoginForm.addEventListener('submit', handleLogin);
    }
    DOMElements.logoutButton.addEventListener('click', () => logout('Ручной выход'));
}