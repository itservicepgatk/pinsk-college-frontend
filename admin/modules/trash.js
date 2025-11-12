import * as api from '../api.js';
import * as ui from '../ui.js';

function renderTrashLearners(learners, container) {
    if (!learners || learners.length === 0) {
        container.innerHTML = '<p>Удаленных учащихся нет.</p>';
        return;
    }
    const rows = learners.map(l => `
        <tr>
            <td>${l.full_name}</td>
            <td>${l.group_name}</td>
            <td>${new Date(l.deleted_at).toLocaleString('ru-RU')}</td>
            <td>
                <button class="btn-primary btn-restore" data-type="learner" data-id="${l.id}">Восстановить</button>
                <button class="btn-danger btn-delete-permanent" data-type="learner" data-id="${l.id}">Удалить навсегда</button>
            </td>
        </tr>
    `).join('');
    container.innerHTML = `<table class="learners-table"><thead><tr><th>ФИО</th><th>Группа</th><th>Удален</th><th>Действия</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderTrashMaterials(materials, container) {
    // Аналогичная функция рендеринга для материалов
    container.innerHTML = '<p>...</p>';
}

async function fetchAndRenderTrash() {
    try {
        const data = await api.getTrashItems();
        renderTrashLearners(data.learners, document.getElementById('trash-learners'));
        // Вызовите другие функции рендеринга здесь
    } catch (error) {
        ui.showAlert('error', 'Ошибка!', 'Не удалось загрузить корзину.');
    }
}

async function handleTrashAction(e) {
    const target = e.target;
    if (!target.matches('.btn-restore') && !target.matches('.btn-delete-permanent')) return;

    const { type, id } = target.dataset;
    const isRestoring = target.classList.contains('btn-restore');
    const actionText = isRestoring ? 'восстановить' : 'удалить навсегда';
    
    if (await ui.showConfirm(`Вы уверены?`, `Вы хотите ${actionText} этот элемент?`)) {
        try {
            const action = isRestoring ? api.restoreTrashItem : api.permanentlyDeleteTrashItem;
            const result = await action(type, id);
            ui.showAlert('success', 'Успех!', result.message);
            fetchAndRenderTrash();
        } catch (error) {
            ui.showAlert('error', 'Ошибка!', error.message);
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

    modal.addEventListener('click', handleTrashAction);

    // Логика переключения вкладок
    const tabLinks = modal.querySelectorAll('.tab-link');
    tabLinks.forEach(link => {
        link.addEventListener('click', () => {
            modal.querySelector('.tab-link.active').classList.remove('active');
            modal.querySelector('.profile-tab-content.active').classList.remove('active');
            link.classList.add('active');
            document.getElementById(link.dataset.tab).classList.add('active');
        });
    });
}