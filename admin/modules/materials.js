import { DOMElements } from '../dom.js';
import * as api from '../api.js';
import * as ui from '../ui.js';

let currentGroup = null;
let currentPath = '';
let materialsCache = { folders: [], files: [] };

function getIconForFile(fileName) {
    const extension = fileName.split('.').pop().toLowerCase();
    switch (extension) {
        // Документы
        case 'pdf': return '📄'; // PDF
        case 'doc':
        case 'docx': return '📝'; // Word
        case 'txt':
        case 'md': return '🗒️'; // Текст

        // Таблицы
        case 'xls':
        case 'xlsx':
        case 'csv': return '📈'; // Excel / CSV

        // Презентации
        case 'ppt':
        case 'pptx': return '📊'; // PowerPoint

        // Изображения
        case 'png':
        case 'jpg':
        case 'jpeg':
        case 'gif':
        case 'webp':
        case 'svg': return '🖼️'; // Картинки

        // Архивы
        case 'zip':
        case 'rar':
        case '7z': return '📦'; // Архивы

        // Аудио и Видео
        case 'mp3':
        case 'wav': return '🎵'; // Аудио
        case 'mp4':
        case 'mov':
        case 'avi': return '🎥'; // Видео

        // Файл по умолчанию
        default: return '📄'; 
    }
}

function updateBreadcrumbs() {
    const breadcrumbsContainer = document.getElementById('material-breadcrumbs');
    breadcrumbsContainer.innerHTML = '';
    
    const rootLink = document.createElement('a');
    rootLink.href = '#';
    rootLink.textContent = `Группа ${currentGroup}`;
    rootLink.dataset.path = '';
    breadcrumbsContainer.appendChild(rootLink);

    let pathAccumulator = '';
    currentPath.split('/').filter(p => p).forEach(part => {
        pathAccumulator += (pathAccumulator ? '/' : '') + part;
        const separator = document.createElement('span');
        separator.textContent = ' / ';
        breadcrumbsContainer.appendChild(separator);

        const partLink = document.createElement('a');
        partLink.href = '#';
        partLink.textContent = part;
        partLink.dataset.path = pathAccumulator;
        breadcrumbsContainer.appendChild(partLink);
    });
}

async function renderMaterials() {
    const listContainer = document.getElementById('materials-list');
    listContainer.innerHTML = '<p>Загрузка...</p>';
    updateBreadcrumbs();
    document.getElementById('material-search-input').value = '';

    try {
        const data = await api.getMaterials(currentGroup, currentPath);
        materialsCache = data;
        displayItems(materialsCache.folders, materialsCache.files);
    } catch (error) {
        listContainer.innerHTML = `<p style="color: red;">${error.message}</p>`;
    }
}

function displayItems(folders, files) {
    const listContainer = document.getElementById('materials-list');
    listContainer.innerHTML = '';
    
    if (folders.length === 0 && files.length === 0) {
        listContainer.innerHTML = '<p>Папка пуста.</p>';
        return;
    }

    folders.forEach(folderName => {
        const el = document.createElement('div');
        el.className = 'material-item';
        el.dataset.type = 'folder';
        el.dataset.name = folderName;
        el.innerHTML = `
            <span class="material-name" style="cursor: pointer; font-weight: bold;">📁 ${folderName}</span>
            <button class="btn-danger btn-delete-item" style="padding: 2px 8px;">Удалить</button>
        `;
        listContainer.appendChild(el);
    });

    files.forEach(file => {
        const el = document.createElement('div');
        el.className = 'material-item';
        el.dataset.type = 'file';
        el.dataset.name = file.name;
        el.innerHTML = `
            <span class="material-name">${getIconForFile(file.name)} ${file.name}</span>
            <button class="btn-danger btn-delete-item" style="padding: 2px 8px;">Удалить</button>
        `;
        listContainer.appendChild(el);
    });
}

async function handleItemClick(e) {
    const target = e.target;
    const itemEl = target.closest('.material-item');
    if (!itemEl) return;

    const type = itemEl.dataset.type;
    const name = itemEl.dataset.name;

    if (target.classList.contains('btn-delete-item')) {
        const fullPath = `dlya-${currentGroup}-gruppy/${currentPath ? currentPath + '/' : ''}${name}`;
        if (type === 'folder') {
            if (await ui.showConfirm(`Удалить папку "${name}"?`, 'Все содержимое папки будет безвозвратно удалено!')) {
                try {
                    await api.deleteMaterialFolder(fullPath);
                    renderMaterials();
                } catch (error) { ui.showAlert('error', 'Ошибка', error.message); }
            }
        } else {
            if (await ui.showConfirm(`Удалить файл "${name}"?`)) {
                try {
                    await api.deleteMaterial(fullPath);
                    renderMaterials();
                } catch (error) { ui.showAlert('error', 'Ошибка', error.message); }
            }
        }
    } else if (target.classList.contains('material-name') && type === 'folder') {
        currentPath = currentPath ? `${currentPath}/${name}` : name;
        renderMaterials();
    }
}

async function handleBreadcrumbClick(e) {
    e.preventDefault();
    if (e.target.tagName === 'A') {
        currentPath = e.target.dataset.path;
        renderMaterials();
    }
}

async function handleCreateFolder() {
    const { value: folderName } = await Swal.fire({
        title: 'Создание новой папки',
        input: 'text',
        inputPlaceholder: 'Имя папки',
        showCancelButton: true,
        inputValidator: (value) => !value && 'Имя папки не может быть пустым!',
    });

    if (folderName) {
        try {
            await api.createMaterialFolder({ group_name: currentGroup, path: currentPath, folderName });
            renderMaterials();
        } catch (error) {
            ui.showAlert('error', 'Ошибка', error.message);
        }
    }
}

async function handleFileUpload(event) {
    const files = event.target.files;
    if (files.length === 0) return;

    const uploadBtn = document.getElementById('upload-file-btn');
    const createFolderBtn = document.getElementById('create-folder-btn');
    uploadBtn.disabled = true;
    createFolderBtn.disabled = true;

    const listContainer = document.getElementById('materials-list');

    if (listContainer.querySelector('p')) {
        listContainer.innerHTML = '';
    }

    for (const file of files) {
        const placeholder = document.createElement('div');
        placeholder.className = 'material-item';
        placeholder.dataset.filename = file.name;
        placeholder.innerHTML = `
            <span>${getIconForFile(file.name)} ${file.name}</span>
            <div class="loader-spinner"></div>
        `;
        listContainer.prepend(placeholder);
    }

    let successCount = 0;
    for (const file of files) {
        const placeholder = listContainer.querySelector(`[data-filename="${file.name}"]`);
        const formData = new FormData();
        formData.append('group_name', currentGroup);
        formData.append('path', currentPath);
        formData.append('materialFile', file);
        
        try {
            await api.uploadMaterial(formData);
            successCount++;
            if (placeholder) {
                placeholder.querySelector('.loader-spinner').outerHTML = '<span class="status-icon">✅</span>';
            }
        } catch (error) {
            if (placeholder) {
                placeholder.querySelector('.loader-spinner').outerHTML = `<span class="status-icon" title="${error.message}">❌</span>`;
            }
        }
    }
    
    if (successCount > 0) {
        ui.showAlert('success', 'Загрузка завершена', `Успешно загружено файлов: ${successCount} из ${files.length}`);
    } else {
        ui.showAlert('error', 'Загрузка не удалась', 'Не удалось загрузить ни одного файла.');
    }

    setTimeout(() => {
        renderMaterials();
        uploadBtn.disabled = false;
        createFolderBtn.disabled = false;
    }, 2000);

    event.target.value = '';
}

function handleSearch(e) {
    const query = e.target.value.toLowerCase();
    const filteredFolders = materialsCache.folders.filter(name => name.toLowerCase().includes(query));
    const filteredFiles = materialsCache.files.filter(item => item.name.toLowerCase().includes(query));
    displayItems(filteredFolders, filteredFiles);
}

export function initializeMaterials() {
    const modal = DOMElements.materialManagerModal;
    const groupSelect = document.getElementById('material-group-select');
    const browser = document.getElementById('material-browser');
    
    DOMElements.materialManagerBtn.addEventListener('click', async () => {
        modal.classList.remove('hidden');
        browser.classList.add('hidden');
        groupSelect.innerHTML = '<option value="">-- Загрузка... --</option>';
        try {
            const groups = await api.getGroups();
            groupSelect.innerHTML = '<option value="">-- Выберите группу --</option>';
            groups.forEach(group => {
                if (group.group_name) {
                    const option = document.createElement('option');
                    option.value = group.group_name;
                    option.textContent = `Группа ${group.group_name}`;
                    groupSelect.appendChild(option);
                }
            });
        } catch (error) {
            ui.showAlert('error', 'Ошибка!', error.message);
        }
    });

    DOMElements.materialManagerCloseBtn.addEventListener('click', () => modal.classList.add('hidden'));

    groupSelect.addEventListener('change', () => {
        currentGroup = groupSelect.value;
        currentPath = '';
        if (currentGroup) {
            browser.classList.remove('hidden');
            renderMaterials();
        } else {
            browser.classList.add('hidden');
        }
    });
    
    document.getElementById('materials-list').addEventListener('click', handleItemClick);
    document.getElementById('material-breadcrumbs').addEventListener('click', handleBreadcrumbClick);
    document.getElementById('create-folder-btn').addEventListener('click', handleCreateFolder);
    document.getElementById('upload-file-btn').addEventListener('click', () => document.getElementById('material-file-input-hidden').click());
    document.getElementById('material-file-input-hidden').addEventListener('change', handleFileUpload);
    document.getElementById('material-search-input').addEventListener('input', handleSearch);
}