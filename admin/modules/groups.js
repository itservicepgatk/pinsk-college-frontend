import { DOMElements } from '../dom.js';
import * as api from '../api.js';
import * as ui from '../ui.js';
import { state, updateState } from '../state.js';
import { fetchLearners, populateGroupFilter } from './learners.js';
import { initializeDashboard } from './dashboard.js';

async function deleteGroup(groupName, learnerCount) {
    const expectedInput = groupName === null ? 'null' : groupName;
    const displayGroupName = groupName === null ? 'null' : groupName;

    const { value: confirmedGroupName } = await Swal.fire({
        title: `Удаление группы ${displayGroupName}`,
        html: `Это действие <b>безвозвратно удалит ВСЕХ учащихся (${learnerCount} чел.)</b> из этой группы, а также <b>ВСЕ учебные материалы</b>.<br><br>Для подтверждения введите номер группы: <b>${displayGroupName}</b>`,
        input: 'text',
        inputPlaceholder: `Введите ${displayGroupName} для подтверждения`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Я понимаю, удалить',
        cancelButtonText: 'Отмена',
        inputValidator: (value) => (value !== expectedInput) ? 'Введенный номер группы не совпадает!' : null,
    });

    if (confirmedGroupName) {
        try {
            const resData = await api.deleteGroup(groupName);
            ui.showAlert('success', 'Удалено!', resData.message);
            initializeDashboard();
            fetchAndRenderGroups();
        } catch (error) {
            ui.showAlert('error', 'Ошибка!', error.message);
        }
    }
}

async function fetchAndRenderGroups() {
    try {
        const groupsData = await api.getGroups();
        DOMElements.groupsContainer.innerHTML = '';
        groupsData.forEach(group => {
            const folder = document.createElement('div');
            folder.className = 'folder';
            folder.innerHTML = `
                <button class="delete-group-btn" title="Удалить группу ${group.group_name}">&times;</button>
                <div class="folder-icon">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21.5714 8.5H6.28571C5.33333 8.5 4.57143 9.22222 4.57143 10.125V17.375C4.57143 18.2778 5.33333 19 6.28571 19H21.5714C22.5238 19 23.2857 18.2778 23.2857 17.375V10.125C23.2857 9.22222 22.5238 8.5 21.5714 8.5Z" fill="#FFCA28"/><path d="M4.88889 17.5C4.09524 17.5 3.42857 16.8611 3.42857 16.1111V6.88889C3.42857 6.13889 4.09524 5.5 4.88889 5.5H10.8571C11.254 5.5 11.631 5.65278 11.9048 5.91667L13.1905 7.16667H19.7143C20.5079 7.16667 21.1746 7.80556 21.1746 8.55556V10.7222H6.55556C5.60317 10.7222 4.88889 11.4444 4.88889 12.3472V17.5Z" fill="#64B5F6"/></svg>
                </div>
                <div class="folder-name">Группа ${group.group_name}</div>
                <div class="folder-count">Учащихся: ${group.total_learners}</div>
            `;
            folder.addEventListener('click', (e) => {
                if (e.target.classList.contains('delete-group-btn')) {
                    e.stopPropagation();
                    deleteGroup(group.group_name, group.total_learners);
                    return;
                }
                updateState({
                    currentSort: { key: 'full_name', direction: 'asc' },
                    currentPage: 1,
                    currentGroupName: group.group_name,
                    currentSearchName: '',
                });
                DOMElements.searchInput.value = '';
                ui.showLearnersView(group.group_name);
                populateGroupFilter().then(() => {
                    DOMElements.groupFilterSelect.value = group.group_name;
                });
                fetchLearners();
            });
            DOMElements.groupsContainer.appendChild(folder);
        });
    } catch (error) {
        ui.showAlert('error', 'Ошибка!', error.message);
    }
}

export function initializeGroups() {
    fetchAndRenderGroups();
}