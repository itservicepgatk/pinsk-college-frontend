import { DOMElements } from '../dom.js';
import * as api from '../api.js';
import * as ui from '../ui.js';

// Удаляем старый объект templates

export async function populateTemplateSelect() {
    const select = document.getElementById('broadcast-template-select');
    try {
        const templates = await api.getAllTemplates();
        select.innerHTML = '<option value="">-- Без шаблона --</option>'; // Reset
        templates.forEach(template => {
            const option = document.createElement('option');
            option.value = template.id;
            option.textContent = template.title;
            // Store content in data attribute to use later
            option.dataset.content = template.content;
            select.appendChild(option);
        });
    } catch (error) {
        console.error("Failed to load templates:", error);
    }
}

function initBroadcastEditor() {
    if (tinymce.get('broadcast-editor')) {
        tinymce.get('broadcast-editor').destroy();
    }
    tinymce.init({
        selector: '#broadcast-editor',
        plugins: 'lists link code wordcount',
        toolbar: 'undo redo | blocks | bold italic | alignleft aligncenter alignright | bullist numlist | link',
        height: 250,
        promotion: false,
    });
}

async function populateBroadcastGroupSelect() {
    const select = document.getElementById('broadcast-group-select');
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

function handleTemplateChange(e) {
    const selectedOption = e.target.options[e.target.selectedIndex];
    const titleInput = document.getElementById('broadcast-title');
    const editor = tinymce.get('broadcast-editor');

    if (selectedOption && selectedOption.value) {
        titleInput.value = selectedOption.textContent;
        editor.setContent(selectedOption.dataset.content || '');
    } else {
        titleInput.value = '';
        editor.setContent('');
    }
}

async function handleSendBroadcast(e) {
    e.preventDefault();
    
    const targetType = document.getElementById('broadcast-target').value;
    const targetGroup = document.getElementById('broadcast-group-select').value;
    const title = document.getElementById('broadcast-title').value;
    const content = tinymce.get('broadcast-editor').getContent();

    if (targetType === 'group' && !targetGroup) {
        return ui.showAlert('warning', 'Внимание', 'Пожалуйста, выберите целевую группу.');
    }

    const confirmText = {
        global: 'всем учащимся',
        group: `учащимся группы ${targetGroup}`,
        debtors: 'всем должникам'
    };

    if (await ui.showConfirm('Подтвердите отправку', `Вы уверены, что хотите отправить это сообщение ${confirmText[targetType]}?`,'Да, отправить')) {
        const formData = new FormData();
        formData.append('title', title);
        formData.append('content', content);
        formData.append('type', targetType);
        if (targetType === 'group') {
            formData.append('target_group', targetGroup);
        }
        
        try {
            Swal.fire({ title: 'Отправка...', didOpen: () => Swal.showLoading() });
            await api.createAnnouncement(formData);
            Swal.close();
            ui.showAlert('success', 'Успех!', 'Рассылка успешно отправлена.');
            document.getElementById('broadcasts-modal').classList.add('hidden');
        } catch (error) {
            Swal.close();
            ui.showAlert('error', 'Ошибка!', error.message);
        }
    }
}

export function initializeBroadcasts() {
    const modal = document.getElementById('broadcasts-modal');
    const openBtn = document.getElementById('broadcasts-btn');
    const closeBtn = document.getElementById('broadcasts-close-btn');
    const form = document.getElementById('broadcast-form');
    const targetSelect = document.getElementById('broadcast-target');
    const groupContainer = document.getElementById('broadcast-group-container');
    const templateSelect = document.getElementById('broadcast-template-select');

    openBtn.addEventListener('click', () => {
        form.reset();
        initBroadcastEditor();
        modal.classList.remove('hidden');
        populateBroadcastGroupSelect();
        populateTemplateSelect();
    });

    closeBtn.addEventListener('click', () => modal.classList.add('hidden'));

    targetSelect.addEventListener('change', (e) => {
        groupContainer.classList.toggle('hidden', e.target.value !== 'group');
    });

    templateSelect.addEventListener('change', handleTemplateChange);
    form.addEventListener('submit', handleSendBroadcast);
}