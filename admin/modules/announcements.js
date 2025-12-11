import { DOMElements } from '../dom.js';
import * as api from '../api.js';
import * as ui from '../ui.js';

let announcementsCache = [];

function initEditor() {
    if (tinymce.get('announcement-editor')) {
        tinymce.get('announcement-editor').destroy();
    }
    tinymce.init({
        selector: '#announcement-editor',
        plugins: 'lists link image table code help wordcount',
        toolbar: 'undo redo | blocks | bold italic | alignleft aligncenter alignright | bullist numlist | link image | code help',
        height: 300,
        promotion: false, // Отключает телеметрию и убирает ошибки из консоли
    });
}

function openAnnouncementModal(mode = 'add', id = null) {
    const form = document.getElementById('announcement-form');
    form.reset();
    document.getElementById('announcement-id').value = '';
    tinymce.get('announcement-editor').setContent('');
    document.getElementById('announcement-group-container').classList.add('hidden');

    const modalTitle = document.getElementById('announcement-modal-title');
    if (mode === 'add') {
        modalTitle.textContent = 'Создать новое объявление';
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        document.getElementById('announcement-publish-at').value = now.toISOString().slice(0, 16);
    } else {
        modalTitle.textContent = 'Редактировать объявление';
        const ann = announcementsCache.find(a => a.id === parseInt(id));
        if (ann) {
            document.getElementById('announcement-id').value = ann.id;
            document.getElementById('announcement-title').value = ann.title;
            tinymce.get('announcement-editor').setContent(ann.content);
            document.getElementById('announcement-is-pinned').checked = ann.is_pinned;
            
            const publishDate = new Date(ann.publish_at);
            publishDate.setMinutes(publishDate.getMinutes() - publishDate.getTimezoneOffset());
            document.getElementById('announcement-publish-at').value = publishDate.toISOString().slice(0, 16);
            
            const typeSelect = document.getElementById('announcement-type');
            typeSelect.value = ann.type;
            if (ann.type === 'group') {
                document.getElementById('announcement-group-container').classList.remove('hidden');
                document.getElementById('announcement-group-select').value = ann.target_group;
            }
        }
    }
    document.getElementById('announcements-modal').classList.remove('hidden');
}

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
                <th>Дата публикации</th>
                <th>Автор</th>
                <th>Действия</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;

    const tbody = table.querySelector('tbody');
    announcements.forEach(ann => {
        const row = document.createElement('tr');
        const isFuturePost = new Date(ann.publish_at) > new Date();

        if (isFuturePost) {
            row.style.backgroundColor = '#fffbe6'; // Светло-желтый фон для запланированных
        }

        const typeText = ann.type === 'global' ? 'Глобальное' : `Группа ${ann.target_group}`;
        const pinIcon = ann.is_pinned ? '📌 ' : '';
        const dateLabel = isFuturePost ? ` <small style="color: #856404;">(запланировано)</small>` : '';

        row.innerHTML = `
            <td>${pinIcon}${ann.title}</td>
            <td>${typeText}</td>
            <td>${new Date(ann.publish_at).toLocaleString('ru-RU')}${dateLabel}</td>
            <td>${ann.admin_login || 'N/A'}</td>
            <td>
                <button class="btn-secondary btn-edit-announcement" data-id="${ann.id}" style="padding: 4px 8px; margin-right: 5px;">Ред.</button>
                <button class="btn-danger btn-delete-announcement" data-id="${ann.id}" style="padding: 4px 8px;">Удал.</button>
            </td>
        `;
        tbody.appendChild(row);
    });

    container.appendChild(table);
}

async function fetchAndRenderAnnouncements() {
    try {
        const announcements = await api.getAnnouncements();
        announcementsCache = announcements;
        renderAnnouncements(announcements);
    } catch (error) {
        ui.showAlert('error', 'Ошибка!', error.message);
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('announcement-id').value;
    const isEditing = !!id;
    const fileInput = document.getElementById('announcement-file');

    const formData = new FormData();
    formData.append('title', document.getElementById('announcement-title').value);
    formData.append('content', tinymce.get('announcement-editor').getContent());
    formData.append('type', document.getElementById('announcement-type').value);
    formData.append('target_group', document.getElementById('announcement-group-select').value);
    formData.append('is_pinned', document.getElementById('announcement-is-pinned').checked);
    formData.append('publish_at', document.getElementById('announcement-publish-at').value || new Date().toISOString());
    if (fileInput.files[0]) {
        formData.append('announcementFile', fileInput.files[0]);
    }
    
    try {
        if (isEditing) {
            // При редактировании мы не поддерживаем замену файла, отправляем JSON
            const data = {
                title: formData.get('title'),
                content: formData.get('content'),
                type: formData.get('type'),
                target_group: formData.get('target_group'),
                is_pinned: formData.get('is_pinned') === 'true',
                publish_at: formData.get('publish_at'),
            };
            await api.updateAnnouncement(id, data);
            ui.showAlert('success', 'Успех!', 'Объявление обновлено.');
        } else {
            await api.createAnnouncement(formData);
            ui.showAlert('success', 'Успех!', 'Объявление опубликовано.');
        }
        
        document.getElementById('announcements-modal').classList.add('hidden');
        fetchAndRenderAnnouncements();
    } catch (error) {
        ui.showAlert('error', 'Ошибка!', error.message);
    }
}

async function handleDelete(e) {
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
    const select = document.getElementById('announcement-group-select');
    try {
        const groups = await api.getGroups();
        select.innerHTML = '<option value="">-- Выберите группу --</option>';
        groups.forEach(group => {
            if (group.group_name) {
                const option = document.createElement('option');
                option.value = group.group_name;
                option.textContent = `Группа ${group.group_name}`;
                select.appendChild(option);
            }
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
        initEditor();
        openAnnouncementModal('add');
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
    
    document.getElementById('announcements-list-container').addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;

        if (target.classList.contains('btn-delete-announcement')) {
            handleDelete(e);
        } else if (target.classList.contains('btn-edit-announcement')) {
            const id = target.dataset.id;
            openAnnouncementModal('edit', id);
        }
    });
}