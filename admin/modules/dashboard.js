import { DOMElements } from '../dom.js';
import * as api from '../api.js';
import * as ui from '../ui.js';

let activeTooltip = null;
let groupChart = null;

function closeActiveTooltip() {
    if (activeTooltip) {
        activeTooltip.originalParent.appendChild(activeTooltip.element);
        activeTooltip.element.classList.add('hidden');
        activeTooltip.element.style = '';
        activeTooltip = null;
        document.removeEventListener('click', closeActiveTooltip, true);
    }
}

function handleDebtorTooltip(e) {
    const btn = e.target.closest('.debtor-info-btn');
    if (!btn) return;
    e.stopPropagation();
    const tooltipElement = btn.nextElementSibling;
    const originalParent = btn.parentElement;
    if (activeTooltip && activeTooltip.element === tooltipElement) {
        closeActiveTooltip();
        return;
    }
    if (activeTooltip) {
        closeActiveTooltip();
    }
    document.body.appendChild(tooltipElement);
    tooltipElement.classList.remove('hidden');
    const rect = btn.getBoundingClientRect();
    const top = rect.top - tooltipElement.offsetHeight - 8;
    const left = rect.left + (rect.width / 2) - (tooltipElement.offsetWidth / 2);
    tooltipElement.style.position = 'absolute';
    tooltipElement.style.top = `${top}px`;
    tooltipElement.style.left = `${left}px`;
    activeTooltip = { element: tooltipElement, originalParent: originalParent };
    setTimeout(() => {
        document.addEventListener('click', closeActiveTooltip, true);
    }, 0);
}

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

function createDebtorsList(debtors) {
    if (!debtors || debtors.length === 0) {
        return '<span class="debtor-info-none">Нет</span>';
    }
    const listItems = debtors.map(d => `<li><strong>${d.full_name}:</strong> ${d.debt}</li>`).join('');
    return `<div class="debtor-info">${debtors.length}<button class="debtor-info-btn">?</button><ul class="debtor-tooltip hidden">${listItems}</ul></div>`;
}

function renderGroupChart(groupsData) {
    const ctx = document.getElementById('group-chart').getContext('2d');

    if (groupChart) {
        groupChart.destroy();
    }

    const labels = groupsData.map(g => `Гр. ${g.group_name}`);
    const totalLearnersData = groupsData.map(g => g.total_learners);
    const debtorsData = groupsData.map(g => g.debtor_count);

    groupChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Всего учащихся',
                data: totalLearnersData,
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }, {
                label: 'Должники',
                data: debtorsData,
                backgroundColor: 'rgba(255, 99, 132, 0.6)',
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Соотношение учащихся и должников по группам'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

async function openDetailsModal() {
    try {
        const groupsData = await api.getGroups();
        
        groupsData.sort((a, b) => 
            (a.group_name || '').localeCompare(b.group_name || '', undefined, { numeric: true })
        );

        DOMElements.groupsStatsTableBody.innerHTML = '';
        groupsData.forEach(group => {
            const row = document.createElement('tr');
            const specialty = group.specialty ? `<br><small style="color: #6c757d;">${group.specialty}</small>` : '';
            row.innerHTML = `
                <td><strong>${group.group_name}</strong>${specialty}</td>
                <td>${group.total_learners}</td>
                <td>${createDebtorsList(group.debtors_list)}</td>
            `;
            DOMElements.groupsStatsTableBody.appendChild(row);
        });
        
        renderGroupChart(groupsData);
        
        DOMElements.detailsModal.classList.remove('hidden');
    } catch (error) {
        ui.showAlert('error', 'Ошибка!', error.message);
    }
}

export function initializeDashboard() {
    fetchDashboardStats();
    DOMElements.detailsBtn.addEventListener('click', openDetailsModal);
    
    DOMElements.detailsModalCloseBtn.addEventListener('click', () => {
        closeActiveTooltip();
        DOMElements.detailsModal.classList.add('hidden');
        if (groupChart) {
            groupChart.destroy();
        }
    });
    
    DOMElements.groupsStatsTableBody.addEventListener('click', handleDebtorTooltip);
}