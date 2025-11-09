import { DOMElements } from '../dom.js';
import * as api from '../api.js';
import * as ui from '../ui.js';
async function updateMaintenanceStatus(enabled) {
    try {
        const response = await api.setMaintenanceStatus({ enabled });
        ui.showAlert('success', 'Успех!', response.message);
    } catch (error) {
        ui.showAlert('error', 'Ошибка!', error.message);
        DOMElements.maintenanceToggle.checked = !enabled;
    }
}
export async function initializeSettings() {
    const toggle = document.getElementById('maintenance-toggle');
    if (!toggle) return;
    try {
        const status = await api.getMaintenanceStatus();
        toggle.checked = status.enabled;
    } catch (error) {
        console.error("Не удалось получить статус режима тестирования");
    }
    toggle.addEventListener('change', (e) => {
        updateMaintenanceStatus(e.target.checked);
    });
}