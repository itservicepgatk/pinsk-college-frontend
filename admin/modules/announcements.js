import { DOMElements } from '../dom.js';
import * as api from '../api.js';
import * as ui from '../ui.js';
function renderAnnouncements(announcements) {
    const container = document.getElementById('announcements-list-container');
    container.innerHTML = '';
    if (announcements.length === 0) {
        container.innerHTML = '<p>Объявлений пока нет.</p>';
        return;
    }
    const table = document.createElement('table');
    table.className = 'learners-table';
    table.innerHTML = `
        <thead>
            <tr>
                <th>Заголовок</th>
                <th>Тип</th>
                <th>Дата</th>
                <th>Автор</th>
                <th>Действия</th>
            </tr>
        </thead>
        <tbody>
        </tbody>
    `;
    const tbody = table.querySelector('tbody');
    announcements.forEach(ann => {
        const row = document.createElement('tr');
        const typeText = ann.type === 'global' ? 'Глобальное' : `Группа ${ann.target_group}`;
        row.innerHTML = `
            <td>${ann.title}</td>
            <td>${typeText}</td>
            <td>${new Date(ann.created_at).toLocaleDateString('ru-RU')}</td>
            <td>${ann.admin_login || 'N/A'}</td>
            <td><button class="btn-danger btn-delete-announcement" data-id="${ann.id}">Удалить</button></td>
        `;
        tbody.appendChild(row);
    });
    container.appendChild(table);
}
async function fetchAndRenderAnnouncements() {
    try {
        const announcements = await api.getAnnouncements();
        renderAnnouncements(announcements);
    } catch (error) {
        ui.showAlert('error', 'Ошибка!', error.message);
    }
}
async function handleFormSubmit(e) {
    e.preventDefault();
    const formData = new FormData();
    formData.append('title', DOMElements.announcementForm.elements['announcement-title'].value);
    formData.append('content', DOMElements.announcementForm.elements['announcement-content'].value);
    formData.append('type', DOMElements.announcementForm.elements['announcement-type'].value);
    formData.append('target_group', DOMElements.announcementForm.elements['announcement-group-select'].value);
    const fileInput = DOMElements.announcementForm.elements['announcement-file'];
    if (fileInput.files[0]) {
        formData.append('announcementFile', fileInput.files[0]);
    }
    try {
        await api.createAnnouncement(formData);
        ui.showAlert('success', 'Успех!', 'Объявление опубликовано.');
        DOMElements.announcementForm.reset();
        document.getElementById('announcement-group-container').classList.add('hidden');
        fetchAndRenderAnnouncements();
    } catch (error) {
        ui.showAlert('error', 'Ошибка!', error.message);
    }
}
async function handleDelete(e) {
    if (!e.target.classList.contains('btn-delete-announcement')) return;
    const id = e.target.dataset.id;
    if (await ui.showConfirm('Вы уверены?', 'Удалить это объявление?')) {
        try {
            await api.deleteAnnouncement(id);
            ui.showAlert('success', 'Удалено!', 'Объявление удалено.');
            fetchAndRenderAnnouncements();
        } catch (error) {
            ui.showAlert('error', 'Ошибка!', error.message);
        }
    }
}
async function populateGroupSelect() {
    const select = DOMElements.announcementForm.elements['announcement-group-select'];
    try {
        const groups = await api.getGroups();
        select.innerHTML = '<option value="">-- Выберите группу --</option>';
        groups.forEach(group => {
            const option = document.createElement('option');
            option.value = group.group_name;
            option.textContent = `Группа ${group.group_name}`;
            select.appendChild(option);
        });
    } catch (error) {
        select.innerHTML = '<option value="">Ошибка загрузки</option>';
    }
}
export function initializeAnnouncements() {
    DOMElements.announcementsBtn = document.getElementById('announcements-btn');
    DOMElements.announcementsModal = document.getElementById('announcements-modal');
    DOMElements.announcementsCloseBtn = document.getElementById('announcements-close-btn');
    DOMElements.announcementForm = document.getElementById('announcement-form');
    DOMElements.announcementsBtn.addEventListener('click', () => {
        DOMElements.announcementsModal.classList.remove('hidden');
        fetchAndRenderAnnouncements();
        populateGroupSelect();
    });
    DOMElements.announcementsCloseBtn.addEventListener('click', () => {
        DOMElements.announcementsModal.classList.add('hidden');
    });
    DOMElements.announcementForm.addEventListener('submit', handleFormSubmit);
    DOMElements.announcementForm.elements['announcement-type'].addEventListener('change', (e) => {
        const groupContainer = document.getElementById('announcement-group-container');
        groupContainer.classList.toggle('hidden', e.target.value !== 'group');
    });
    document.getElementById('announcements-list-container').addEventListener('click', handleDelete);
}