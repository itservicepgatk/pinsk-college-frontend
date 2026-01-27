import { DOMElements } from '../dom.js';
import * as api from '../api.js';
import * as ui from '../ui.js';

let currentGroup = null;
let currentPath = '';
let materialsCache = { folders: [], files: [] };

// === ФУНКЦИЯ ОБРАТНОЙ ТРАНСЛИТЕРАЦИИ (LATIN -> CYRILLIC) ===
function detransliterate(text) {
    if (!text) return text;

    // Отделяем расширение файла, чтобы не переводить его (например .docx)
    const lastDotIndex = text.lastIndexOf('.');
    let name = text;
    let ext = '';
    if (lastDotIndex !== -1) {
        name = text.substring(0, lastDotIndex);
        ext = text.substring(lastDotIndex);
    }

    // Заменяем подчеркивания на пробелы
    name = name.replace(/_/g, ' ');

    // Словарь замен (сначала сложные сочетания!)
    const map = {
        'SCH': 'Щ', 'Sch': 'Щ', 'sch': 'щ',
        'ZH': 'Ж', 'Zh': 'Ж', 'zh': 'ж',
        'CH': 'Ч', 'Ch': 'Ч', 'ch': 'ч',
        'SH': 'Ш', 'Sh': 'Ш', 'sh': 'ш',
        'YU': 'Ю', 'Yu': 'Ю', 'yu': 'ю',
        'YA': 'Я', 'Ya': 'Я', 'ya': 'я',
        'A': 'А', 'a': 'а',
        'B': 'Б', 'b': 'б',
        'V': 'В', 'v': 'в',
        'G': 'Г', 'g': 'г',
        'D': 'Д', 'd': 'д',
        'E': 'Е', 'e': 'е',
        'Z': 'З', 'z': 'з',
        'I': 'И', 'i': 'и',
        'J': 'Й', 'j': 'й',
        'K': 'К', 'k': 'к',
        'L': 'Л', 'l': 'л',
        'M': 'М', 'm': 'м',
        'N': 'Н', 'n': 'н',
        'O': 'О', 'o': 'о',
        'P': 'П', 'p': 'п',
        'R': 'Р', 'r': 'р',
        'S': 'С', 's': 'с',
        'T': 'Т', 't': 'т',
        'U': 'У', 'u': 'у',
        'F': 'Ф', 'f': 'ф',
        'H': 'Х', 'h': 'х',
        'C': 'Ц', 'c': 'ц',
        'Y': 'Ы', 'y': 'ы'
    };

    for (const [eng, rus] of Object.entries(map)) {
        name = name.split(eng).join(rus);
    }

    return name + ext;
}

function getIconForFile(fileName) {
    const extension = fileName.split('.').pop().toLowerCase();
    switch (extension) {
        case 'pdf': return '📄';
        case 'doc': case 'docx': return '📝';
        case 'txt': case 'md': return '🗒️';
        case 'xls': case 'xlsx': case 'csv': return '📈';
        case 'ppt': case 'pptx': return '📊';
        case 'png': case 'jpg': case 'jpeg': case 'gif': case 'webp': case 'svg': return '🖼️';
        case 'zip': case 'rar': case '7z': return '📦';
        case 'mp3': case 'wav': return '🎵';
        case 'mp4': case 'mov': case 'avi': return '🎥';
        default: return '📄';
    }
}

function updateBreadcrumbs() {
    const breadcrumbsContainer = document.getElementById('material-breadcrumbs');
    breadcrumbsContainer.innerHTML = '';
    const rootLink = document.createElement('a');
    rootLink.href = '#';
    rootLink.textContent = currentGroup === '_shared' ? 'Общие материалы' : `Группа ${currentGroup}`;
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
        // Отображаем красивое имя в хлебных крошках
        partLink.textContent = detransliterate(part);
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
        return;
    }
    
    folders.forEach(folderName => {
        const el = document.createElement('div');
        el.className = 'material-item';
        el.dataset.type = 'folder';
        el.dataset.name = folderName; // В dataset храним ОРИГИНАЛЬНОЕ имя (латиница) для API
        
        // Для отображения используем кириллицу
        const displayName = detransliterate(folderName);

        el.innerHTML = `
            <span class="material-name" style="cursor: pointer; font-weight: bold;">📁 ${displayName}</span>
            <button class="btn-danger btn-delete-item" style="padding: 2px 8px;">Удалить</button>
        `;
        listContainer.appendChild(el);
    });

    files.forEach(file => {
        const el = document.createElement('div');
        el.className = 'material-item';
        el.dataset.type = 'file';
        el.dataset.name = file.name; // В dataset храним ОРИГИНАЛЬНОЕ имя
        
        const extension = file.name.split('.').pop().toLowerCase();
        const viewableExtensions = [
            'pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg',
            'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
            'txt', 'md', 'json', 'js', 'css', 'html',
            'mp3', 'wav', 'mp4', 'webm'
        ];
        const isPreviewable = viewableExtensions.includes(extension);
        
        // Для отображения используем кириллицу
        const displayName = detransliterate(file.name);

        el.innerHTML = `
            <span class="material-name">${getIconForFile(file.name)} ${displayName}</span>
            <div>
                ${isPreviewable ? '<button class="btn-secondary btn-preview-item" style="padding: 2px 8px; margin-right: 5px;">Просмотр</button>' : ''}
                <button class="btn-secondary btn-actions-item" style="padding: 2px 8px; margin-right: 5px; background-color: #17a2b8; color: white;">⚙️</button>
                <button class="btn-danger btn-delete-item" style="padding: 2px 8px;">Удалить</button>
            </div>
        `;
        listContainer.appendChild(el);
    });
}

async function handleTransfer(fileName, filePath) {
    let groups = {};
    try {
        const groupsData = await api.getGroups();
        groupsData.forEach(g => groups[g.group_name] = `Группа ${g.group_name}`);
        groups['_shared'] = 'Общие материалы';
    } catch (e) {
        console.error(e);
        return ui.showAlert('error', 'Ошибка', 'Не удалось загрузить список групп');
    }

    const { value: action } = await Swal.fire({
        title: `Действия с файлом`,
        text: detransliterate(fileName), // Показываем красивое имя
        input: 'radio',
        inputOptions: {
            'copy': 'Копировать (дублировать)',
            'move': 'Переместить'
        },
        inputValue: 'copy',
        showCancelButton: true,
        confirmButtonText: 'Далее'
    });

    if (!action) return;

    const { value: targetGroup } = await Swal.fire({
        title: action === 'move' ? 'Куда переместить?' : 'Куда скопировать?',
        input: 'select',
        inputOptions: groups,
        inputPlaceholder: 'Выберите группу',
        showCancelButton: true,
        confirmButtonText: 'Выполнить',
        inputValidator: (value) => {
            if (!value) return 'Нужно выбрать группу!';
        }
    });

    if (targetGroup) {
        try {
            ui.showLoading();
            const res = await api.transferMaterial(filePath, targetGroup, action);
            ui.closeLoading();
            ui.showAlert('success', 'Успех', res.message);
            renderMaterials();
        } catch (error) {
            ui.closeLoading();
            ui.showAlert('error', 'Ошибка', error.message);
        }
    }
}

async function previewFile(filePath, fileName) {
    try {
        Swal.fire({ title: 'Загрузка файла...', didOpen: () => Swal.showLoading() });
        const { signedUrl } = await api.getSignedMaterialUrl(filePath);
        Swal.close();
        
        const extension = fileName.split('.').pop().toLowerCase();
        const displayName = detransliterate(fileName); // Красивое имя для заголовка

        if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(extension)) {
            Swal.fire({
                title: displayName,
                imageUrl: signedUrl,
                imageAlt: displayName,
                width: '80vw',
                showCloseButton: true,
                confirmButtonText: 'Скачать',
                preConfirm: () => window.open(signedUrl, '_blank')
            });
        } 
        else if (extension === 'pdf') {
            window.open(signedUrl, '_blank');
        }
        else if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension)) {
            const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(signedUrl)}&embedded=true`;
            Swal.fire({
                title: displayName,
                html: `<iframe src="${googleViewerUrl}" style="width:100%; height:80vh; border:none;"></iframe>`,
                width: '90vw',
                showCloseButton: true,
                showConfirmButton: false,
                footer: `<a href="${signedUrl}" target="_blank" class="btn-primary" style="text-decoration:none; padding:8px 16px; border-radius:4px;">Скачать оригинал</a>`
            });
        }
        else if (['txt', 'md', 'json', 'js', 'css', 'html', 'xml'].includes(extension)) {
            const response = await fetch(signedUrl);
            const text = await response.text();
            Swal.fire({
                title: displayName,
                html: `<pre style="text-align:left; max-height:70vh; overflow:auto; background:#f4f4f4; padding:10px; border-radius:5px;"><code>${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`,
                width: '80vw',
                showCloseButton: true
            });
        }
        else if (['mp3', 'wav', 'ogg'].includes(extension)) {
            Swal.fire({
                title: displayName,
                html: `<audio controls style="width:100%"><source src="${signedUrl}" type="audio/${extension}"></audio>`,
                showCloseButton: true
            });
        }
        else if (['mp4', 'webm'].includes(extension)) {
            Swal.fire({
                title: displayName,
                html: `<video controls style="width:100%; max-height:70vh;"><source src="${signedUrl}" type="video/${extension}"></video>`,
                width: '80vw',
                showCloseButton: true
            });
        }
        else {
            window.open(signedUrl, '_blank');
        }
    } catch (error) {
        ui.showAlert('error', 'Ошибка предпросмотра', error.message);
    }
}

async function handleItemClick(e) {
    const target = e.target;
    const itemEl = target.closest('.material-item');
    if (!itemEl) return;
    
    const type = itemEl.dataset.type;
    const name = itemEl.dataset.name; // Это ОРИГИНАЛЬНОЕ имя (латиница)
    const displayName = detransliterate(name); // Это для отображения в алертах

    const basePath = currentGroup === '_shared' ? 'shared-materials' : `dlya-${currentGroup}-gruppy`;
    const fullPath = `${basePath}/${currentPath ? currentPath + '/' : ''}${name}`;

    if (target.classList.contains('btn-preview-item')) {
        previewFile(fullPath, name);
    } else if (target.classList.contains('btn-actions-item')) {
        handleTransfer(name, fullPath); 
    } else if (target.classList.contains('btn-delete-item')) {
        if (type === 'folder') {
             if (await ui.showConfirm(`Удалить папку "${displayName}"?`, 'Все содержимое папки будет безвозвратно удалено!')) {
                try {
                    await api.deleteMaterialFolder(fullPath);
                    renderMaterials();
                } catch (error) { ui.showAlert('error', 'Ошибка', error.message); }
            }
        } else {
            if (await ui.showConfirm(`Удалить файл "${displayName}"?`)) {
                try {
                    await api.deleteMaterial(fullPath);
                    renderMaterials();
                } catch (error) { ui.showAlert('error', 'Ошибка', error.message); }
            }
        }
    }
    else if (target.classList.contains('material-name') && type === 'folder') {
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
    const { value: folderName } = await Swal.fire({ title: 'Создание новой папки', input: 'text', inputPlaceholder: 'Имя папки', showCancelButton: true, inputValidator: (value) => !value && 'Имя папки не может быть пустым!' });
    if (folderName) {
        try {
            await api.createMaterialFolder({ group_name: currentGroup, path: currentPath, folderName });
            renderMaterials();
        } catch (error) {
            ui.showAlert('error', 'Ошибка', error.message);
        }
    }
}

function uploadFiles(files) {
    const progressContainer = document.getElementById('upload-progress-container');
    progressContainer.innerHTML = '';
    const uploadPromises = [];

    for (const file of files) {
        const progressId = `progress-${Math.random().toString(36).substr(2, 9)}`;
        const progressItem = document.createElement('div');
        progressItem.className = 'progress-bar-item';
        progressItem.id = progressId;
        
        // Показываем оригинальное имя при загрузке (или можно тоже перевести, но лучше оригинал, чтобы видеть что грузится)
        progressItem.innerHTML = `
            <span class="file-name">${file.name}</span>
            <div class="progress-bar-bg">
                <div class="progress-bar-fg"></div>
            </div>
            <span class="progress-status">0%</span>
        `;
        progressContainer.appendChild(progressItem);

        const formData = new FormData();
        formData.append('group_name', currentGroup);
        formData.append('path', currentPath);
        formData.append('materialFile', file);

        const uploadPromise = api.uploadMaterialWithProgress(formData, (event) => {
            const percent = Math.round((event.loaded / event.total) * 100);
            const progressBar = document.querySelector(`#${progressId} .progress-bar-fg`);
            const progressStatus = document.querySelector(`#${progressId} .progress-status`);
            if (progressBar) progressBar.style.width = `${percent}%`;
            if (progressStatus) progressStatus.textContent = `${percent}%`;
        }).then(() => {
            const progressStatus = document.querySelector(`#${progressId} .progress-status`);
            if (progressStatus) progressStatus.textContent = '✅';
        }).catch((error) => {
            const progressStatus = document.querySelector(`#${progressId} .progress-status`);
            if (progressStatus) {
                progressStatus.textContent = '❌';
                progressStatus.title = error.message;
            }
        });
        uploadPromises.push(uploadPromise);
    }

    Promise.allSettled(uploadPromises).then(() => {
        setTimeout(() => {
            progressContainer.innerHTML = '';
            renderMaterials();
        }, 3000);
    });
}

function handleSearch(e) {
    const query = e.target.value.toLowerCase();
    
    // Фильтруем по переведенному имени, чтобы поиск работал по-русски
    const filteredFolders = materialsCache.folders.filter(name => detransliterate(name).toLowerCase().includes(query));
    const filteredFiles = materialsCache.files.filter(item => detransliterate(item.name).toLowerCase().includes(query));
    
    displayItems(filteredFolders, filteredFiles);
}

export function initializeMaterials() {
    const modal = DOMElements.materialManagerModal;
    const groupSelect = document.getElementById('material-group-select');
    const browser = document.getElementById('material-browser');
    const tabGroups = document.getElementById('material-tab-groups');
    const tabShared = document.getElementById('material-tab-shared');
    const groupSelectorContainer = document.getElementById('material-group-selector-container');
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('material-file-input-hidden');

    DOMElements.materialManagerBtn.addEventListener('click', async () => {
        modal.classList.remove('hidden');
        browser.classList.add('hidden');
        groupSelectorContainer.style.display = 'block';
        tabGroups.classList.add('active');
        tabShared.classList.remove('active');
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

    tabGroups.addEventListener('click', (e) => {
        e.preventDefault();
        tabGroups.classList.add('active');
        tabShared.classList.remove('active');
        groupSelectorContainer.style.display = 'block';
        browser.classList.add('hidden');
        groupSelect.value = '';
    });

    tabShared.addEventListener('click', (e) => {
        e.preventDefault();
        tabShared.classList.add('active');
        tabGroups.classList.remove('active');
        groupSelectorContainer.style.display = 'none';
        browser.classList.remove('hidden');
        currentGroup = '_shared';
        currentPath = '';
        renderMaterials();
    });

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

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, e => {
            e.preventDefault();
            e.stopPropagation();
        });
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'));
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'));
    });

    dropZone.addEventListener('drop', (e) => {
        uploadFiles(e.dataTransfer.files);
    });

    document.getElementById('materials-list').addEventListener('click', handleItemClick);
    document.getElementById('material-breadcrumbs').addEventListener('click', handleBreadcrumbClick);
    document.getElementById('create-folder-btn').addEventListener('click', handleCreateFolder);
    document.getElementById('upload-file-btn').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => uploadFiles(e.target.files));
    document.getElementById('material-search-input').addEventListener('input', handleSearch);
}