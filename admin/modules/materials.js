import { DOMElements } from '../dom.js';
import * as api from '../api.js';
import * as ui from '../ui.js';
async function renderMaterialsForGroup(groupName) {
    DOMElements.currentMaterialsList.innerHTML = '<p>Загрузка...</p>';
    try {
        const materials = await api.getMaterialsForGroup(groupName);
        if (materials.length === 0) {
            DOMElements.currentMaterialsList.innerHTML = '<p>Материалы не загружены.</p>';
            return;
        }
        DOMElements.currentMaterialsList.innerHTML = '';
        materials.forEach(material => {
            const el = document.createElement('div');
            el.className = 'material-item';
            el.innerHTML = `
                <span>${material.name}</span>
                <button type="button" class="btn-danger btn-delete-material" data-path="${material.path}">Удалить</button>
            `;
            DOMElements.currentMaterialsList.appendChild(el);
        });
    } catch (error) {
        DOMElements.currentMaterialsList.innerHTML = `<p style="color: red;">${error.message}</p>`;
    }
}
async function handleDeleteMaterial(e) {
    if (!e.target.classList.contains('btn-delete-material')) return;
    const filePath = e.target.dataset.path;
    const fileName = filePath.split('/').pop();
    if (await ui.showConfirm('Вы уверены?', `Удалить файл "${fileName}"?`)) {
        try {
            const resData = await api.deleteMaterial(filePath);
            ui.showAlert('success', 'Удалено!', resData.message);
            renderMaterialsForGroup(DOMElements.materialGroupSelect.value);
        } catch (error) {
            ui.showAlert('error', 'Ошибка!', error.message);
        }
    }
}
async function handleUploadMaterial(e) {
    e.preventDefault();
    const group_name = DOMElements.materialGroupSelect.value;
    const file = DOMElements.materialFileInput.files[0];
    if (!group_name || !file) {
        return ui.showAlert('warning', 'Ошибка', 'Выберите группу и файл.');
    }
    const formData = new FormData();
    formData.append('group_name', group_name);
    formData.append('materialFile', file);
    try {
        const resData = await api.uploadMaterial(formData);
        ui.showAlert('success', 'Успех!', resData.message);
        DOMElements.materialManagerForm.reset();
        DOMElements.materialsListContainer.classList.add('hidden');
        DOMElements.uploadMaterialContainer.classList.add('hidden');
        DOMElements.materialGroupSelect.value = '';
    } catch (error) {
        ui.showAlert('error', 'Ошибка!', error.message);
    }
}
export function initializeMaterials() {
    DOMElements.materialManagerBtn.addEventListener('click', async () => {
        DOMElements.materialManagerForm.reset();
        DOMElements.materialGroupSelect.innerHTML = '<option value="">-- Загрузка... --</option>';
        DOMElements.currentMaterialsList.innerHTML = '<p>Выберите группу.</p>';
        DOMElements.materialsListContainer.classList.add('hidden');
        DOMElements.uploadMaterialContainer.classList.add('hidden');
        DOMElements.materialManagerModal.classList.remove('hidden');
        try {
            const groups = await api.getGroups();
            DOMElements.materialGroupSelect.innerHTML = '<option value="">-- Выберите группу --</option>';
            groups.forEach(group => {
                const option = document.createElement('option');
                option.value = group.group_name;
                option.textContent = `Группа ${group.group_name}`;
                DOMElements.materialGroupSelect.appendChild(option);
            });
        } catch (error) {
            ui.showAlert('error', 'Ошибка!', error.message);
            DOMElements.materialManagerModal.classList.add('hidden');
        }
    });
    DOMElements.materialManagerCloseBtn.addEventListener('click', () => {
        DOMElements.materialManagerModal.classList.add('hidden');
    });
    DOMElements.materialGroupSelect.addEventListener('change', () => {
        const selectedGroup = DOMElements.materialGroupSelect.value;
        const show = !!selectedGroup;
        DOMElements.materialsListContainer.classList.toggle('hidden', !show);
        DOMElements.uploadMaterialContainer.classList.toggle('hidden', !show);
        if (show) renderMaterialsForGroup(selectedGroup);
    });
    DOMElements.currentMaterialsList.addEventListener('click', handleDeleteMaterial);
    DOMElements.materialManagerForm.addEventListener('submit', handleUploadMaterial);
}