import { DOMElements } from '../dom.js';
import * as api from '../api.js';
import * as ui from '../ui.js';

// Хранилище загруженных студентов текущей группы
let currentGroupLearners = [];

function generateTicketHTML(learner, groupName) {
    // Базовый URL сайта
    const baseUrl = 'https://itservicepgatk.github.io/pinsk-college-frontend/';
    
    // Ссылка для QR-кода с "магическим" параметром
    // Если у студента нет ключа (старая база), генерируем просто ссылку на сайт
    const magicLink = learner.qr_key 
        ? `${baseUrl}?qr_login=${learner.qr_key}`
        : baseUrl;

    // Генерируем QR через API
    const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&margin=0&data=${encodeURIComponent(magicLink)}`;

    const shortUrl = 'bit.ly/pgatk'; // Для ручного ввода

    // Если пароль есть (новый), показываем его. Если нет - линию.
    const passwordDisplay = learner.password 
        ? `<span class="pass-text">${learner.password}</span>` 
        : '<span class="pass-dots">........................</span>';

    return `
        <div class="ticket-card">
            <div class="ticket-header">
                <div class="brand-area">
                    <img src="assets/images/logo.webp" class="ticket-logo" alt="Logo" onerror="this.style.display='none'">
                    <div class="brand-text">
                        <div class="brand-title">ПГАТК</div>
                        <div class="brand-subtitle">Образовательный портал</div>
                    </div>
                </div>
                <div class="ticket-type">БИЛЕТ ДОСТУПА</div>
            </div>
            
            <div class="ticket-content">
                <div class="info-column">
                    <div class="instruction-title">Как войти в систему:</div>
                    
                    <div class="step-row">
                        <div class="step-icon">1</div>
                        <div class="step-desc">
                            Откройте сайт <br>
                            <span class="url-highlight">${shortUrl}</span>
                        </div>
                    </div>

                    <div class="step-row">
                        <div class="step-icon">2</div>
                        <div class="step-desc">
                            Выберите вкладку <br>
                            <strong>"Учащийся"</strong>
                        </div>
                    </div>

                    <div class="step-row">
                        <div class="step-icon">3</div>
                        <div class="step-desc">
                            Введите данные <br>
                            с карточки справа 👉
                        </div>
                    </div>

                    <div class="qr-area">
                        <img src="${qrSrc}" class="qr-img" alt="QR">
                        <div class="qr-label">
                            Наведите камеру<br>
                            <span style="color: #2563eb; font-weight: bold;">для АВТО-ВХОДА</span> 🚀
                        </div>
                    </div>
                </div>

                <div class="credentials-column">
                    <div class="cred-card">
                        <div class="cred-header">ВАШИ ДАННЫЕ</div>
                        <div class="cred-group">
                            <div class="cred-label">ЛОГИН</div>
                            <div class="cred-value">${learner.login}</div>
                        </div>
                        <div class="cred-group">
                            <div class="cred-label">ПАРОЛЬ</div>
                            <div class="cred-value password">${passwordDisplay}</div>
                        </div>
                        <div class="student-details">
                            <div class="student-name">${learner.full_name}</div>
                            <div class="student-group">Группа: ${groupName}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="ticket-footer">
                Пожалуйста, сохраните этот билет. При утере обратитесь к куратору группы.
            </div>
        </div>
    `;
}

async function populateGroupSelect() {
    const select = document.getElementById('ticket-group-select');
    try {
        const groups = await api.getGroups();
        select.innerHTML = '<option value="">-- Выберите группу --</option>';
        groups.forEach(group => {
            const option = document.createElement('option');
            option.value = group.group_name;
            option.textContent = `Группа ${group.group_name} (${group.total_learners} чел.)`;
            select.appendChild(option);
        });
    } catch (error) {
        select.innerHTML = '<option value="">Ошибка загрузки</option>';
    }
}

async function loadStudentsForGroup(groupName) {
    const listContainer = document.getElementById('ticket-students-list');
    const containerBlock = document.getElementById('ticket-students-list-container');
    
    if (!groupName) {
        containerBlock.classList.add('hidden');
        return;
    }

    listContainer.innerHTML = '<div style="padding:10px;">Загрузка...</div>';
    containerBlock.classList.remove('hidden');

    try {
        // Запрашиваем список студентов (включая qr_key, если он есть в API)
        const params = new URLSearchParams({ searchGroup: groupName, limit: 1000, sortBy: 'full_name' });
        const data = await api.getLearners(params);
        currentGroupLearners = data.learners;

        listContainer.innerHTML = '';
        if (currentGroupLearners.length === 0) {
            listContainer.innerHTML = '<div style="padding:10px;">В группе нет учащихся.</div>';
            return;
        }

        currentGroupLearners.forEach(learner => {
            const item = document.createElement('div');
            item.style.cssText = 'padding: 8px 10px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center;';
            item.innerHTML = `
                <input type="checkbox" class="ticket-student-checkbox" value="${learner.id}" id="ts-${learner.id}" style="margin-right: 10px; width: 18px; height: 18px;">
                <label for="ts-${learner.id}" style="cursor: pointer; flex-grow: 1; margin: 0;">${learner.full_name}</label>
            `;
            listContainer.appendChild(item);
        });
        
        toggleSelectAll(true);

    } catch (error) {
        listContainer.innerHTML = `<div style="padding:10px; color:red;">Ошибка: ${error.message}</div>`;
    }
}

function toggleSelectAll(checked) {
    document.querySelectorAll('.ticket-student-checkbox').forEach(cb => cb.checked = checked);
    const btn = document.getElementById('ticket-select-all-btn');
    if (btn) {
        btn.textContent = checked ? 'Снять выделение' : 'Выбрать всех';
        btn.dataset.state = checked ? 'all' : 'none';
    }
}

async function handlePrint() {
    const groupName = document.getElementById('ticket-group-select').value;
    const layout = document.getElementById('ticket-layout-select').value;
    const generateNew = document.getElementById('ticket-new-passwords').checked;
    
    const selectedIds = Array.from(document.querySelectorAll('.ticket-student-checkbox:checked')).map(cb => cb.value);

    if (selectedIds.length === 0) {
        return ui.showAlert('warning', 'Внимание', 'Выберите хотя бы одного учащегося.');
    }

    let learnersToPrint = [];

    if (generateNew) {
        const confirmed = await ui.showConfirm(
            'Сгенерировать новые пароли?', 
            `Выбрано учащихся: ${selectedIds.length}. Их старые пароли перестанут работать!`,
            'Да, сменить и печатать'
        );
        if (!confirmed) return;

        try {
            ui.showLoading('Генерация паролей...');
            const response = await api.resetPasswordsForList(selectedIds);
            learnersToPrint = response.learners;
            ui.closeLoading();
        } catch (error) {
            ui.closeLoading();
            return ui.showAlert('error', 'Ошибка', error.message);
        }
    } else {
        // Берем данные из кэша
        learnersToPrint = currentGroupLearners.filter(l => selectedIds.includes(String(l.id)));
    }

    renderPrintView(learnersToPrint, groupName, layout);
}

function renderPrintView(learners, groupName, layout) {
    const printSection = document.getElementById('print-section');
    printSection.innerHTML = '';
    printSection.className = `layout-${layout}`;

    const itemsPerPage = parseInt(layout);
    
    for (let i = 0; i < learners.length; i += itemsPerPage) {
        const page = document.createElement('div');
        page.className = 'ticket-page';
        
        for (let j = 0; j < itemsPerPage; j++) {
            if (learners[i + j]) {
                const ticketHTML = generateTicketHTML(learners[i + j], groupName);
                const ticketWrapper = document.createElement('div');
                ticketWrapper.className = 'ticket-wrapper';
                ticketWrapper.innerHTML = ticketHTML;
                page.appendChild(ticketWrapper);
            }
        }
        
        // Добавляем разделители, если нужно (для макета 2)
        if (layout === '2' && learners[i] && learners[i+1]) {
             const separator = document.createElement('div');
             separator.className = 'ticket-separator';
             separator.innerHTML = '<span class="scissors">✂️</span><span class="cut-text">линия отреза</span>';
             // Вставляем разделитель между билетами (это нужно делать аккуратно, зависит от CSS Grid)
             // В текущем CSS Grid разделитель не нужен, так как есть gap.
             // Но если очень хочется линию, её можно добавить как псевдоэлемент к ticket-page
        }
        
        printSection.appendChild(page);
    }

    // Даем время на загрузку картинок QR
    setTimeout(() => {
        window.print();
    }, 1000);
}

// ЭКСПОРТИРУЕМ ФУНКЦИЮ ДЛЯ ВНЕШНЕГО ИСПОЛЬЗОВАНИЯ (например, из groupEditor)
export async function printTicketsForGroup(groupName, learnersWithPasswords = null) {
    let learners = [];
    if (learnersWithPasswords) {
        learners = learnersWithPasswords;
    } else {
        try {
            ui.showLoading('Загрузка...');
            const params = new URLSearchParams({ searchGroup: groupName, limit: 1000 });
            const data = await api.getLearners(params);
            learners = data.learners;
            ui.closeLoading();
        } catch (e) {
            ui.closeLoading();
            return;
        }
    }
    
    renderPrintView(learners, groupName, 2);
}

export function initializeTickets() {
    const btn = document.getElementById('print-tickets-btn');
    const modal = document.getElementById('print-tickets-modal');
    const closeBtn = document.getElementById('print-tickets-close-btn');
    const generateBtn = document.getElementById('generate-tickets-btn');
    const groupSelect = document.getElementById('ticket-group-select');
    const selectAllBtn = document.getElementById('ticket-select-all-btn');

    if (btn) {
        btn.addEventListener('click', () => {
            modal.classList.remove('hidden');
            populateGroupSelect();
            document.getElementById('ticket-students-list-container').classList.add('hidden');
            document.getElementById('ticket-new-passwords').checked = false;
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
    }

    if (groupSelect) {
        groupSelect.addEventListener('change', (e) => {
            loadStudentsForGroup(e.target.value);
        });
    }

    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', () => {
            const isAll = selectAllBtn.dataset.state === 'all';
            toggleSelectAll(!isAll);
        });
    }

    if (generateBtn) {
        generateBtn.addEventListener('click', handlePrint);
    }
}