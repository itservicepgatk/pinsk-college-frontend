import { DOMElements } from '../dom.js';
import * as api from '../api.js';
import * as ui from '../ui.js';
import { state, updateState } from '../state.js';
import { fetchLearners, populateGroupFilter } from './learners.js';
import { initializeDashboard } from './dashboard.js';
async function deleteGroup(groupName, learnerCount) {
    const { value: confirmedGroupName } = await Swal.fire({
        title: `Удаление группы ${groupName}`,
        html: `Это действие <b>безвозвратно удалит ВСЕХ учащихся (${learnerCount} чел.)</b> из этой группы, а также <b>ВСЕ учебные материалы</b>.<br><br>Для подтверждения введите номер группы: <b>${groupName}</b>`,
        input: 'text',
        inputPlaceholder: `Введите ${groupName} для подтверждения`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Я понимаю, удалить',
        cancelButtonText: 'Отмена',
        inputValidator: (value) => (value !== groupName) ? 'Введенный номер группы не совпадает!' : null,
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
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http:
                </div>
                <div class="folder-name">Группа ${group.group_name}</div>
                <div class="folder-count">Учащихся: ${group.learner_count}</div>
            `;
            folder.addEventListener('click', (e) => {
                if (e.target.classList.contains('delete-group-btn')) {
                    e.stopPropagation();
                    deleteGroup(group.group_name, group.learner_count);
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