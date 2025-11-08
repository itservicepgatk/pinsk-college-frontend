import { DOMElements } from '../dom.js';
import * as api from '../api.js';
import * as ui from '../ui.js';

async function fetchDashboardStats() {
    try {
        const stats = await api.getDashboardStats();
        DOMElements.totalLearnersStat.textContent = stats.totalLearners;
        DOMElements.debtorsCountStat.textContent = stats.debtorsCount;
    } catch (error) {
        console.error(error.message);
        DOMElements.totalLearnersStat.textContent = '—';
        DOMElements.debtorsCountStat.textContent = '—';
    }
}

async function openDetailsModal() {
    try {
        const groupsData = await api.getGroups();
        DOMElements.groupsStatsTableBody.innerHTML = '';
        groupsData.forEach(group => {
            const row = document.createElement('tr');
            row.innerHTML = `<td>${group.group_name}</td><td>${group.learner_count}</td>`;
            DOMElements.groupsStatsTableBody.appendChild(row);
        });
        DOMElements.detailsModal.classList.remove('hidden');
    } catch (error) {
        ui.showAlert('error', 'Ошибка!', error.message);
    }
}

export function initializeDashboard() {
    fetchDashboardStats();
    DOMElements.detailsBtn.addEventListener('click', openDetailsModal);
    DOMElements.detailsModalCloseBtn.addEventListener('click', () => {
        DOMElements.detailsModal.classList.add('hidden');
    });
}