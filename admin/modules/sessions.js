import { DOMElements } from '../dom.js';
import * as api from '../api.js';
import * as ui from '../ui.js';
let currentSessionPage = 1;
function formatStatus(isOnline, isActive) {
    if (isOnline && isActive) {
        return '<span class="status-dot online"></span> Онлайн';
    }
    return '<span class="status-dot offline"></span> Офлайн';
}
function formatDate(dateString) {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString('ru-RU');
}
function formatFlag(countryCode) {
    if (countryCode) {
        return `<img src="https://flagcdn.com/w20/${countryCode.toLowerCase()}.png" alt="${countryCode}" title="${countryCode}">`;
    }
    return `<svg class="flag-placeholder" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>`;
}
function renderSessionLogs(logs) {
    DOMElements.sessionsLogTableBody.innerHTML = '';
    if (!logs || logs.length === 0) {
        DOMElements.sessionsLogTableBody.innerHTML = '<tr><td colspan="8" style="text-align: center;">Записи не найдены.</td></tr>';
        return;
    }
    logs.forEach(log => {
        const row = document.createElement('tr');
        if (log.user_type === 'admin') {
            if (log.role === 'superadmin') {
                row.classList.add('session-log-superadmin');
            } else {
                row.classList.add('session-log-admin');
            }
        }
        row.innerHTML = `
            <td>${formatStatus(log.is_online, log.is_active)}</td>
            <td>${log.user_name}</td>
            <td>${log.group_name || 'N/A'}</td>
            <td>${formatDate(log.login_time)}</td>
            <td>${formatDate(log.last_activity)}</td>
            <td>${formatDate(log.logout_time)}</td>
            <td>${log.ip_address || 'N/A'}</td>
            <td>${formatFlag(log.country_code)}</td>
        `;
        DOMElements.sessionsLogTableBody.appendChild(row);
    });
}
async function fetchSessionLogs() {
    try {
        const params = new URLSearchParams({ page: currentSessionPage, limit: 15 });
        const data = await api.getSessionLogs(params);
        renderSessionLogs(data.logs);
        const paginationContainer = document.querySelector('#sessions-pagination-container .pagination-wrapper');
        ui.renderPagination(data.totalPages, data.currentPage, paginationContainer, (page) => {
            currentSessionPage = page;
            fetchSessionLogs();
        });
    } catch (error) {
        ui.showAlert('error', 'Ошибка!', error.message);
    }
}
export function initializeSessions() {
    if (!DOMElements.sessionsManagerBtn) return;
    DOMElements.sessionsManagerBtn.addEventListener('click', () => {
        const isHidden = DOMElements.sessionsManagerModal.classList.contains('hidden');
        DOMElements.auditLogModal.classList.add('hidden');
        if (isHidden) {
            currentSessionPage = 1;
            DOMElements.sessionsManagerModal.classList.remove('hidden');
            fetchSessionLogs();
        } else {
            DOMElements.sessionsManagerModal.classList.add('hidden');
        }
    });
    DOMElements.sessionsManagerCloseBtn.addEventListener('click', () => {
        DOMElements.sessionsManagerModal.classList.add('hidden');
    });
}