import * as api from '../api.js';
import * as ui from '../ui.js';
import { populateTemplateSelect } from './broadcasts.js';

let templateEditor = null;

function initTemplateEditor() {
    if (tinymce.get('template-editor')) {
        tinymce.get('template-editor').destroy();
    }
    tinymce.init({
        selector: '#template-editor',
        plugins: 'lists link code wordcount',
        toolbar: 'undo redo | blocks | bold italic | alignleft aligncenter alignright | bullist numlist | link',
        height: 200,
        promotion: false,
    }).then(editors => templateEditor = editors[0]);
}

function renderTemplates(templates) {
    const container = document.getElementById('templates-list-container');
    container.innerHTML = '';
    if (templates.length === 0) {
        container.innerHTML = '<p>Пользовательских шаблонов пока нет.</p>';
        return;
    }

    templates.forEach(template => {
        const item = document.createElement('div');
        item.className = 'backup-item';
        item.dataset.id = template.id;
        item.dataset.title = template.title;

        const contentDiv = document.createElement('div');
        contentDiv.textContent = template.content;
        item.dataset.content = contentDiv.innerHTML;

        item.innerHTML = `
            <div><strong>${template.title}</strong></div>
            <div>
                <button class="btn-secondary btn-edit-template">Редактировать</button>
                <button class="btn-danger btn-delete-template">Удалить</button>
            </div>
        `;
        container.appendChild(item);
    });
}

async function fetchAndRenderTemplates() {
    try {
        const templates = await api.getAllTemplates();
        renderTemplates(templates);
    } catch (error) {
        ui.showAlert('error', 'Ошибка', error.message);
    }
}

function resetTemplateForm() {
    const form = document.getElementById('template-form');
    form.reset();
    document.getElementById('template-id').value = '';
    if (templateEditor) templateEditor.setContent('');
    form.querySelector('button[type="submit"]').textContent = 'Сохранить шаблон';
}

async function handleTemplateFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('template-id').value;
    const title = document.getElementById('template-title').value;
    const content = templateEditor.getContent();

    const data = { title, content };

    try {
        if (id) {
            await api.updateTemplate(id, data);
            ui.showAlert('success', 'Успех', 'Шаблон обновлен.');
        } else {
            await api.createTemplate(data);
            ui.showAlert('success', 'Успех', 'Шаблон создан.');
        }
        resetTemplateForm();
        fetchAndRenderTemplates();
        populateTemplateSelect();
    } catch (error) {
        ui.showAlert('error', 'Ошибка', error.message);
    }
}

function handleTemplateListClick(e) {
    const target = e.target;
    const item = target.closest('.backup-item');
    if (!item) return;

    const id = item.dataset.id;

    if (target.classList.contains('btn-edit-template')) {
        document.getElementById('template-id').value = id;
        document.getElementById('template-title').value = item.dataset.title;
        templateEditor.setContent(item.dataset.content);
        document.querySelector('#template-form button[type="submit"]').textContent = 'Обновить шаблон';
    }

    if (target.classList.contains('btn-delete-template')) {
        ui.showConfirm('Удалить шаблон?', `Вы уверены, что хотите удалить шаблон "${item.dataset.title}"?`)
            .then(async result => {
                if (result.isConfirmed) {
                    try {
                        await api.deleteTemplate(id);
                        ui.showAlert('success', 'Успех', 'Шаблон удален.');
                        fetchAndRenderTemplates();
                        populateTemplateSelect();
                    } catch (error) {
                        ui.showAlert('error', 'Ошибка', error.message);
                    }
                }
            });
    }
}

export function initializeTemplates() {
    const modal = document.getElementById('template-manager-modal');
    const openBtn = document.getElementById('manage-templates-btn');
    const closeBtn = document.getElementById('template-manager-close-btn');

    openBtn.addEventListener('click', () => {
        modal.classList.remove('hidden');
        initTemplateEditor();
        resetTemplateForm();
        fetchAndRenderTemplates();
    });

    closeBtn.addEventListener('click', () => modal.classList.add('hidden'));

    document.getElementById('template-form').addEventListener('submit', handleTemplateFormSubmit);
    document.getElementById('template-form-cancel-btn').addEventListener('click', resetTemplateForm);
    document.getElementById('templates-list-container').addEventListener('click', handleTemplateListClick);
}