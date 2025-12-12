import { DOMElements } from '../dom.js';
import * as api from '../api.js';
import * as ui from '../ui.js';
import { state } from '../state.js';

async function fetchAndRenderAdmins() {
    try {
        const admins = await api.getAdmins();
        DOMElements.adminsTableBody.innerHTML = '';
        admins.forEach(admin => {
            const row = document.createElement('tr');
            row.dataset.adminId = admin.id;
            row.dataset.adminLogin = admin.login; // Сохраняем логин для удобства
            
            const roleText = admin.role === 'superadmin' ? 'Супер-админ' : 'Админ';
            
            let actionsHtml = '';
            
            if (Number(admin.id) !== state.userFromToken?.adminId) { 
                 if (admin.role !== 'superadmin') {
                     actionsHtml = `
                        <button class="btn-secondary btn-reset-password" style="padding: 6px 10px; margin-right: 5px;" title="Сменить пароль"><i class="fa-solid fa-key"></i></button>
                        <button class="btn-danger btn-delete-admin" style="padding: 6px 12px; font-size: 12px;">Удалить</button>
                     `;
                 }
            }

            if (admin.role !== 'superadmin') {
                 actionsHtml = `
                    <div style="display: flex; justify-content: flex-end; gap: 5px;">
                        <button class="btn-secondary btn-reset-password" style="padding: 6px 10px;" title="Сменить пароль"><i class="fa-solid fa-key"></i></button>
                        <button class="btn-danger btn-delete-admin" style="padding: 6px 12px; font-size: 12px;">Удалить</button>
                    </div>
                 `;
            }

            row.innerHTML = `
                <td>${admin.login}</td>
                <td style="text-align: center;">${roleText}</td>
                <td style="text-align: right;">${actionsHtml}</td>
            `;
            DOMElements.adminsTableBody.appendChild(row);
        });
    } catch (error) {
        ui.showAlert('error', 'Ошибка!', error.message);
    }
}

async function handleAddAdmin(e) {
    e.preventDefault();
    const login = DOMElements.addAdminForm.elements['new-admin-login'].value;
    const password = DOMElements.addAdminForm.elements['new-admin-password'].value;
    try {
        const data = await api.createAdmin({ login, password, role: 'admin' });
        ui.showAlert('success', 'Успех!', `Администратор ${data.login} создан.`);
        DOMElements.addAdminForm.reset();
        fetchAndRenderAdmins();
    } catch (error) {
        ui.showAlert('error', 'Ошибка!', error.message);
    }
}

async function handleAdminActions(e) {
    const target = e.target.closest('button');
    if (!target) return;

    const row = target.closest('tr');
    const adminId = row.dataset.adminId;
    const adminLogin = row.dataset.adminLogin;

    if (target.classList.contains('btn-delete-admin')) {
        if (await ui.showConfirm('Вы уверены?', `Удалить администратора ${adminLogin}?`)) {
            try {
                const data = await api.deleteAdmin(adminId);
                ui.showAlert('success', 'Удалено!', data.message);
                fetchAndRenderAdmins();
            } catch (error) {
                ui.showAlert('error', 'Ошибка!', error.message);
            }
        }
    } 
    else if (target.classList.contains('btn-reset-password')) {
        handleResetPassword(adminId, adminLogin);
    }
}

async function handleResetPassword(id, login) {
    const randomPass = Math.random().toString(36).slice(-8);

    const { value: formValues } = await Swal.fire({
        title: `Смена пароля для ${login}`,
        html: `
            <div style="display: flex; gap: 10px; align-items: center;">
                <input id="swal-new-password" class="swal2-input" placeholder="Новый пароль" value="${randomPass}" style="margin: 0; flex-grow: 1;">
                <button type="button" class="swal2-confirm swal2-styled" style="background-color: #6c757d; margin: 0; padding: 10px;" onclick="document.getElementById('swal-new-password').value = Math.random().toString(36).slice(-8)">
                    <i class="fa-solid fa-arrows-rotate"></i>
                </button>
            </div>
            <p style="font-size: 13px; color: #666; margin-top: 10px;">Нажмите кнопку справа для генерации другого пароля.</p>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Сохранить',
        preConfirm: () => {
            return document.getElementById('swal-new-password').value;
        }
    });

    if (formValues) {
        try {
            ui.showLoading();
            const res = await api.resetAdminPassword(id, formValues);
            ui.closeLoading();
            
            await Swal.fire({
                title: 'Пароль изменен!',
                html: `Новый пароль для <b>${login}</b>:<br><br><code style="font-size: 24px; background: #f1f5f9; padding: 10px; border-radius: 8px;">${formValues}</code>`,
                icon: 'success'
            });
            
        } catch (error) {
            ui.closeLoading();
            ui.showAlert('error', 'Ошибка', error.message);
        }
    }
}

export function initializeAdmins() {
    if (!DOMElements.manageAdminsBtn) return;
    DOMElements.manageAdminsBtn.addEventListener('click', () => {
        DOMElements.manageAdminsModal.classList.remove('hidden');
        fetchAndRenderAdmins();
    });
    DOMElements.manageAdminsCloseBtn.addEventListener('click', () => {
        DOMElements.manageAdminsModal.classList.add('hidden');
    });
    DOMElements.addAdminForm.addEventListener('submit', handleAddAdmin);
    DOMElements.adminsTableBody.addEventListener('click', handleAdminActions);
}