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
        return `<img src="https:
    }
    return `<svg class="flag-placeholder" xmlns="http:
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