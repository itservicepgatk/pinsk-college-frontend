import { DOMElements } from '../dom.js';
import * as api from '../api.js';
import * as ui from '../ui.js';

async function updateSetting(key, value) {
    try {
        const response = await api.setMaintenanceStatus({ key, value });
        ui.showAlert('success', 'Успех!', response.message);
    } catch (error) {
        ui.showAlert('error', 'Ошибка!', error.message);
        return false;
    }
    return true;
}

export async function initializeSettings() {
    const maintenanceToggle = document.getElementById('maintenance-toggle');
    const telegramToggle = document.getElementById('telegram-notify-toggle');

    try {
        const settings = await api.getMaintenanceStatus();
        if (maintenanceToggle) maintenanceToggle.checked = !!settings.maintenance_mode;
        if (telegramToggle) telegramToggle.checked = settings.admin_login_notifications !== false;
    } catch (error) {
        console.error("Не удалось получить настройки системы");
    }

    if (maintenanceToggle) {
        maintenanceToggle.addEventListener('change', async (e) => {
            const success = await updateSetting('maintenance_mode', e.target.checked);
            if (!success) e.target.checked = !e.target.checked;
        });
    }

    if (telegramToggle) {
        telegramToggle.addEventListener('change', async (e) => {
            const success = await updateSetting('admin_login_notifications', e.target.checked);
            if (!success) e.target.checked = !e.target.checked;
        });
    }
}