import { DOMElements } from '../dom.js';
import * as ui from '../ui.js';
import * as api from '../api.js';
import { state } from '../state.js';

let editingId = null;

export async function checkForNewUpdates() {
    try {
        const data = await api.checkUpdates();
        if (!data || !data.timestamp) return;

        const lastReadTime = localStorage.getItem('lastReadNewsTime');
        const serverUpdateTime = new Date(data.timestamp).getTime();
        
        if (!lastReadTime) {
            showNotificationBadge();
            return;
        }

        if (serverUpdateTime > Number(lastReadTime)) {
            showNotificationBadge();
        } else {
            hideNotificationBadge();
        }
    } catch (error) {
    }
}

function showNotificationBadge() {
    const btn = document.getElementById('updates-btn');
    if (!btn) return;
    if (!btn.querySelector('.notification-badge')) {
        const badge = document.createElement('span');
        badge.className = 'notification-badge';
        btn.appendChild(badge);
    }
}

function hideNotificationBadge() {
    const badge = document.querySelector('#updates-btn .notification-badge');
    if (badge) badge.remove();
}

function markUpdatesAsRead() {
    localStorage.setItem('lastReadNewsTime', Date.now() + 1000);
    hideNotificationBadge();
}

function renderUpdates(updates) {
    const container = document.getElementById('updates-list');
    container.innerHTML = '';

    if (updates.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#888;">Пока нет новостей.</p>';
        return;
    }

    updates.forEach(update => {
        const date = new Date(update.created_at).toLocaleDateString('ru-RU', {
            day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        let actionsHtml = '';
        if (state.userRole === 'superadmin') {
            actionsHtml = `
                <div class="update-actions" style="position: absolute; top: 10px; right: 10px;">
                   <button class="btn-edit-update" data-id="${update.id}" data-title="${update.title}" style="border:none; background:none; cursor:pointer; color:#0d6efd; margin-right:5px;"><i class="fa-solid fa-pen"></i></button>
                   <button class="btn-delete-update" data-id="${update.id}" style="border:none; background:none; cursor:pointer; color:#dc3545;"><i class="fa-solid fa-trash"></i></button>
               </div>
            `;
        }

        const item = document.createElement('div');
        item.className = 'update-item';
        const contentHtml = update.content.split('\n').join('<br>');

        item.innerHTML = `
            <div class="update-date">${date}</div>
            <div class="update-content-box" style="position: relative;">
                ${actionsHtml}
                <div class="update-title">${update.title}</div>
                <div class="update-text" id="content-${update.id}">${contentHtml}</div>
                <div class="update-author">Автор: ${update.author_name || 'System'}</div>
            </div>
        `;
        const editBtn = item.querySelector('.btn-edit-update');
        if (editBtn) {
            editBtn.setAttribute('data-content', update.content);
        }
        
        container.appendChild(item);
    });
}

async function loadUpdates() {
    try {
        const updates = await api.getSystemUpdates();
        renderUpdates(updates);
    } catch (error) {
        console.error(error);
        const list = document.getElementById('updates-list');
        if(list) list.innerHTML = '<p style="color:red; text-align:center;">Ошибка загрузки новостей</p>';
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const title = document.getElementById('update-title').value;
    const content = document.getElementById('update-content').value;

    try {
        ui.showLoading();
        
        if (editingId) {
            await api.updateSystemUpdate(editingId, { title, content });
            ui.showAlert('success', 'Обновлено', 'Новость успешно изменена.');
            cancelEditMode();
        } else {
            await api.createSystemUpdate({ title, content });
            ui.showAlert('success', 'Опубликовано', 'Новость добавлена.');
            document.getElementById('create-update-form').reset();
        }
        
        ui.closeLoading();
        loadUpdates();
    } catch (error) {
        ui.closeLoading();
        ui.showAlert('error', 'Ошибка', error.message);
    }
}

function enableEditMode(id, title, content) {
    editingId = id;
    document.getElementById('update-title').value = title;
    document.getElementById('update-content').value = content;
    
    const submitBtn = document.querySelector('#create-update-form button[type="submit"]');
    if(submitBtn) {
        submitBtn.textContent = 'Сохранить изменения';
        submitBtn.classList.remove('btn-primary');
        submitBtn.style.backgroundColor = '#ffc107';
        submitBtn.style.color = '#000';

        let cancelBtn = document.getElementById('cancel-update-edit');
        if (!cancelBtn) {
            cancelBtn = document.createElement('button');
            cancelBtn.id = 'cancel-update-edit';
            cancelBtn.type = 'button';
            cancelBtn.className = 'btn-secondary';
            cancelBtn.textContent = 'Отмена';
            cancelBtn.style.marginLeft = '10px';
            cancelBtn.onclick = cancelEditMode;
            submitBtn.parentNode.appendChild(cancelBtn);
        }
    }
    
    const modalContent = document.querySelector('#updates-modal .modal-content');
    if(modalContent) modalContent.scrollTop = 0;
}

function cancelEditMode() {
    editingId = null;
    const form = document.getElementById('create-update-form');
    if(form) form.reset();
    
    const submitBtn = document.querySelector('#create-update-form button[type="submit"]');
    if(submitBtn) {
        submitBtn.textContent = 'Опубликовать';
        submitBtn.classList.add('btn-primary');
        submitBtn.style.backgroundColor = ''; 
        submitBtn.style.color = '';
    }

    const cancelBtn = document.getElementById('cancel-update-edit');
    if (cancelBtn) cancelBtn.remove();
}

async function handleDelete(id) {
    if (await ui.showConfirm('Удалить новость?', 'Это действие нельзя отменить.')) {
        try {
            ui.showLoading();
            await api.deleteSystemUpdate(id);
            ui.closeLoading();
            loadUpdates();
            if (editingId == id) cancelEditMode();
        } catch (error) {
            ui.closeLoading();
            ui.showAlert('error', 'Ошибка', error.message);
        }
    }
}

export function initializeUpdates() {
    const btn = document.getElementById('updates-btn');
    const modal = document.getElementById('updates-modal');
    const closeBtn = document.getElementById('updates-close-btn');
    const form = document.getElementById('create-update-form');
    const list = document.getElementById('updates-list');

    if (btn) {
        checkForNewUpdates();

        btn.addEventListener('click', () => {
            modal.classList.remove('hidden');
            cancelEditMode();
            loadUpdates();
            markUpdatesAsRead();
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
            cancelEditMode();
        });
    }

    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }

    if (list) {
        list.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.btn-edit-update');
            const deleteBtn = e.target.closest('.btn-delete-update');

            if (editBtn) {
                const id = editBtn.dataset.id;
                const title = editBtn.dataset.title;
                const content = editBtn.dataset.content;
                enableEditMode(id, title, content);
            }

            if (deleteBtn) {
                handleDelete(deleteBtn.dataset.id);
            }
        });
    }
}