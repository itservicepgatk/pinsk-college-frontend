import { DOMElements } from '../dom.js';
import * as api from '../api.js';
import * as ui from '../ui.js';

async function fetchAndRenderBackups() {
    DOMElements.backupListContainer.innerHTML = '<p style="padding: 20px; text-align: center; color: #94a3b8;">Загрузка...</p>';
    try {
        const backups = await api.getBackups();
        if (!backups || backups.length === 0) {
            DOMElements.backupListContainer.innerHTML = '<p style="padding: 20px; text-align: center;">Резервные копии не найдены.</p>';
            return;
        }
        DOMElements.backupListContainer.innerHTML = backups.map(backup => `
            <div class="backup-item" data-filename="${backup.name}" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid #f1f5f9; background: #fff;">
                <div>
                    <div style="font-weight: 600; color: #334155; font-size: 14px;">${backup.name}</div>
                    <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">
                        <i class="fa-regular fa-clock"></i> ${new Date(backup.created_at).toLocaleString('ru-RU')}
                    </div>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="btn-secondary btn-restore-backup" style="padding: 6px 12px; font-size: 12px;">Восстановить</button>
                    <button class="btn-danger btn-delete-backup" style="padding: 6px 12px; font-size: 12px;">Удалить</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        DOMElements.backupListContainer.innerHTML = `<p style="padding: 20px; text-align: center; color: #ef4444;">${error.message}</p>`;
    }
}

async function createManualBackup() {
    if (await ui.showConfirm('Создать резервную копию?', 'Это может занять некоторое время.', 'Да, создать')) {
        try {
            Swal.fire({ title: 'Создание копии...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
            const data = await api.createBackup();
            Swal.close();
            ui.showAlert('success', 'Успех!', data.message);
            fetchAndRenderBackups();
        } catch (error) {
            Swal.close();
            ui.showAlert('error', 'Ошибка!', error.message);
        }
    }
}

async function handleRestore(fileName) {
    const { value: confirmation } = await Swal.fire({
        title: 'ПОДТВЕРДИТЕ ДЕЙСТВИЕ',
        html: `<p style="color: red; font-weight: bold;">ВНИМАНИЕ! ЭТО НЕОБРАТИМО!</p>
               <p>Все текущие данные будут <b>НАВСЕГДА УДАЛЕНЫ</b> и заменены данными из файла <strong>${fileName}</strong>.</p>
               <p>Для подтверждения, введите имя файла:</p>`,
        input: 'text',
        inputPlaceholder: fileName,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Я понимаю, восстановить!',
        confirmButtonColor: '#d33',
        cancelButtonText: 'Отмена',
        inputValidator: (value) => value !== fileName ? 'Имя файла не совпадает!' : null
    });

    if (confirmation) {
        try {
            Swal.fire({ title: 'Восстановление...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
            const data = await api.restoreBackup(fileName);
            await Swal.fire('Успех!', data.message, 'success');
            window.location.reload();
        } catch (error) {
            ui.showAlert('error', 'Ошибка восстановления!', error.message);
        }
    }
}

async function handleDelete(fileName) {
    const { value: password } = await Swal.fire({
        title: 'Подтвердите удаление',
        html: `Вы уверены, что хотите навсегда удалить файл <b>${fileName}</b>?`,
        icon: 'warning',
        input: 'password',
        inputPlaceholder: 'Введите ваш пароль для подтверждения',
        showCancelButton: true,
        confirmButtonText: 'Да, удалить!',
        confirmButtonColor: '#d33',
        cancelButtonText: 'Отмена',
        showLoaderOnConfirm: true,
        preConfirm: async (password) => {
            if (!password) {
                Swal.showValidationMessage('Пароль не может быть пустым');
                return false;
            }
            try {
                return await api.deleteBackup({ fileName, password });
            } catch (error) {
                Swal.showValidationMessage(`Ошибка: ${error.message}`);
                return false;
            }
        },
        allowOutsideClick: () => !Swal.isLoading()
    });
    if (password) {
        ui.showAlert('success', 'Удалено!', password.message);
        fetchAndRenderBackups();
    }
}

function handleBackupActions(e) {
    const target = e.target;
    const item = target.closest('.backup-item');
    if (!item) return;
    const fileName = item.dataset.filename;
    if (target.classList.contains('btn-restore-backup')) {
        handleRestore(fileName);
    } else if (target.classList.contains('btn-delete-backup')) {
        handleDelete(fileName);
    }
}

export function initializeBackups() {
    if (!DOMElements.manageBackupsBtn) return;
    DOMElements.manageBackupsBtn.addEventListener('click', () => {
        DOMElements.backupManagerModal.classList.remove('hidden');
        fetchAndRenderBackups();
    });
    DOMElements.backupManagerCloseBtn.addEventListener('click', () => {
        DOMElements.backupManagerModal.classList.add('hidden');
    });
    DOMElements.createBackupManualBtn.addEventListener('click', createManualBackup);
    DOMElements.backupListContainer.addEventListener('click', handleBackupActions);
}