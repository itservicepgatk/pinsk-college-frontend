
// Mock imports
const api = {};
const ui = {};

let currentTab = 'learners';

function getActionsBarHTML(type) {
    return `
        <div class="trash-actions-bar">
            <button class="btn-danger btn-outline btn-delete-selected" data-type="${type}">
                <i class="fa-solid fa-check-double"></i> Удалить выбранные
            </button>
            <button class="btn-danger btn-empty-trash" data-type="${type}">
                <i class="fa-solid fa-dumpster-fire"></i> Очистить всё
            </button>
        </div>
    `;
}

function renderTrashLearners(learners, container) {
    container.innerHTML = getActionsBarHTML('learner');
    
    if (!learners || learners.length === 0) {
        container.innerHTML += '<p>Удаленных учащихся нет.</p>';
        return;
    }
    const rows = learners.map(l => `
        <tr>
            <td><input type="checkbox" class="trash-checkbox" value="${l.id}"></td>
            <td>${l.full_name}</td>
            <td>${l.group_name}</td>
            <td>${new Date(l.deleted_at).toLocaleString('ru-RU')}</td>
            <td>
                <button class="btn-primary btn-restore" data-type="learner" data-id="${l.id}" style="padding: 4px 8px;">Восст.</button>
            </td>
        </tr>
    `).join('');
    
    container.innerHTML += `
        <table class="learners-table">
            <thead>
                <tr>
                    <th style="width: 30px;"><input type="checkbox" id="select-all-trash-learners"></th>
                    <th>ФИО</th><th>Группа</th><th>Удален</th><th>Действия</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>`;
    
    setTimeout(() => {
        const selectAll = document.getElementById('select-all-trash-learners');
        if(selectAll) {
            selectAll.addEventListener('change', (e) => {
                container.querySelectorAll('.trash-checkbox').forEach(cb => cb.checked = e.target.checked);
            });
        }
    }, 0);
}

function renderTrashMaterials(materials, container) {
    container.innerHTML = getActionsBarHTML('material');
    
    if (!materials || materials.length === 0) {
        container.innerHTML += '<p>Удаленных материалов нет.</p>';
        return;
    }

    const rows = materials.map(m => {
        const displayPath = m.original_path.length > 50 ? '...' + m.original_path.slice(-50) : m.original_path;
        return `
        <tr>
            <td><input type="checkbox" class="trash-checkbox" value="${m.id}"></td>
            <td title="${m.original_path}">${displayPath}</td>
            <td>${new Date(m.deleted_at).toLocaleString('ru-RU')}</td>
            <td>
                <button class="btn-primary btn-restore" data-type="material" data-id="${m.id}" style="padding: 4px 8px;">Восст.</button>
            </td>
        </tr>
    `}).join('');

    container.innerHTML += `
        <table class="learners-table">
            <thead>
                <tr>
                    <th style="width: 30px;"><input type="checkbox" id="select-all-trash-materials"></th>
                    <th>Файл / Путь</th><th>Дата удаления</th><th>Действия</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>`;

    setTimeout(() => {
        const selectAll = document.getElementById('select-all-trash-materials');
        if(selectAll) {
            selectAll.addEventListener('change', (e) => {
                container.querySelectorAll('.trash-checkbox').forEach(cb => cb.checked = e.target.checked);
            });
        }
    }, 0);
}

async function fetchAndRenderTrash() {
    try {
        const data = await api.getTrashItems();
        renderTrashLearners(data.learners, document.getElementById('trash-learners'));
        renderTrashMaterials(data.materials, document.getElementById('trash-materials'));
    } catch (error) {
        ui.showAlert('error', 'Ошибка!', 'Не удалось загрузить корзину.');
    }
}

async function handleRestore(type, id) {
    try {
        const result = await api.restoreTrashItem(type, id);
        ui.showAlert('success', 'Успех!', result.message);
        fetchAndRenderTrash();
    } catch (error) {
        ui.showAlert('error', 'Ошибка!', error.message);
    }
}

async function handleDeleteSelected(type) {
    const container = document.getElementById(type === 'learner' ? 'trash-learners' : 'trash-materials');
    const checkedBoxes = container.querySelectorAll('.trash-checkbox:checked');
    const ids = Array.from(checkedBoxes).map(cb => cb.value);

    if (ids.length === 0) return ui.showAlert('warning', 'Пусто', 'Выберите элементы для удаления.');

    if (await ui.showConfirm('Удалить навсегда?', `Выбрано элементов: ${ids.length}. Восстановить их будет невозможно.`)) {
        try {
            ui.showLoading();
            const result = await api.deleteTrashItems(type, ids);
            ui.closeLoading();
            ui.showAlert('success', 'Удалено', result.message);
            fetchAndRenderTrash();
        } catch (error) {
            ui.closeLoading();
            ui.showAlert('error', 'Ошибка', error.message);
        }
    }
}

async function handleEmptyTrash(type) {
    if (await ui.showConfirm('Очистить корзину?', `Все элементы типа "${type === 'learner' ? 'Учащиеся' : 'Материалы'}" будут удалены навсегда!`)) {
        try {
            ui.showLoading();
            const result = await api.emptyTrash(type);
            ui.closeLoading();
            ui.showAlert('success', 'Очищено', result.message);
            fetchAndRenderTrash();
        } catch (error) {
            ui.closeLoading();
            ui.showAlert('error', 'Ошибка', error.message);
        }
    }
}

export function initializeTrash() {
    const modal = document.getElementById('trash-modal');
    const openBtn = document.getElementById('trash-btn');
    const closeBtn = document.getElementById('trash-close-btn');

    openBtn.addEventListener('click', () => {
        modal.classList.remove('hidden');
        fetchAndRenderTrash();
    });

    closeBtn.addEventListener('click', () => modal.classList.add('hidden'));

    // Делегирование событий
    modal.addEventListener('click', (e) => {
        const target = e.target;
        
        if (target.classList.contains('btn-restore')) {
            handleRestore(target.dataset.type, target.dataset.id);
        }
        else if (target.classList.contains('btn-delete-selected')) {
            handleDeleteSelected(target.dataset.type);
        }
        else if (target.classList.contains('btn-empty-trash')) {
            handleEmptyTrash(target.dataset.type);
        }
    });

    const tabLinks = modal.querySelectorAll('.tab-link');
    tabLinks.forEach(link => {
        link.addEventListener('click', () => {
            modal.querySelector('.tab-link.active').classList.remove('active');
            modal.querySelector('.profile-tab-content.active').classList.remove('active');
            link.classList.add('active');
            document.getElementById(link.dataset.tab).classList.add('active');
            currentTab = link.dataset.tab === 'trash-learners' ? 'learners' : 'materials';
        });
    });
}
