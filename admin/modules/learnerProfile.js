import { DOMElements } from '../dom.js';
import * as api from '../api.js';
import { openLearnerModal } from './learners.js';

function renderGeneralTab(learner) {
    const container = document.getElementById('profile-tab-general');
    container.innerHTML = `
        <div class="profile-general-grid">
            <div><strong>ФИО:</strong> ${learner.full_name}</div>
            <div><strong>Логин:</strong> ${learner.login}</div>
            <div><strong>Группа:</strong> ${learner.group_name}</div>
            <div><strong>Курс:</strong> ${learner.course}</div>
            <div><strong>Специальность:</strong> ${learner.specialty || 'Не указано'}</div>
            <div><strong>Дата зачисления:</strong> ${learner.enrollment_date || 'Не указано'}</div>
            <div class="grid-col-span-2"><strong>Расписание сессий:</strong> <pre>${learner.session_schedule || 'Нет данных'}</pre></div>
            <div class="grid-col-span-2"><strong>Академ. задолженности:</strong> <pre>${learner.academic_debts || 'Отсутствуют'}</pre></div>
        </div>
        <div class="modal-buttons">
            <button id="profile-edit-btn" class="btn-primary">Редактировать</button>
        </div>
    `;
    document.getElementById('profile-edit-btn').addEventListener('click', () => {
        openLearnerModal('edit', learner.id);
    });
}

function renderSessionsTab(sessions) {
    const container = document.getElementById('profile-tab-sessions');
    if (!sessions || sessions.length === 0) {
        container.innerHTML = '<p>История входов в систему пуста.</p>';
        return;
    }
    const rows = sessions.map(s => `
        <tr>
            <td>${new Date(s.login_time).toLocaleString('ru-RU')}</td>
            <td>${s.logout_time ? new Date(s.logout_time).toLocaleString('ru-RU') : 'Активна'}</td>
            <td>${s.ip_address}</td>
            <td>${s.user_agent}</td>
        </tr>
    `).join('');
    container.innerHTML = `
        <table class="learners-table">
            <thead><tr><th>Вход</th><th>Выход</th><th>IP-адрес</th><th>Устройство</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>
    `;
}

function renderAuditTab(auditLogs) {
    const container = document.getElementById('profile-tab-audit');
    if (!auditLogs || auditLogs.length === 0) {
        container.innerHTML = '<p>История изменений этого профиля пуста.</p>';
        return;
    }
    const rows = auditLogs.map(log => `
        <tr>
            <td>${new Date(log.timestamp).toLocaleString('ru-RU')}</td>
            <td>${log.action_type}</td>
            <td>${log.details}</td>
            <td>${log.admin_login || 'N/A'}</td>
        </tr>
    `).join('');
    container.innerHTML = `
        <table class="learners-table">
            <thead><tr><th>Время</th><th>Действие</th><th>Описание</th><th>Администратор</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>
    `;
}

export async function openLearnerProfile(learnerId) {
    const modal = document.getElementById('learner-profile-modal');
    const title = document.getElementById('profile-modal-title');
    document.getElementById('profile-tab-general').innerHTML = '<p>Загрузка...</p>';
    document.getElementById('profile-tab-sessions').innerHTML = '<p>Загрузка...</p>';
    document.getElementById('profile-tab-audit').innerHTML = '<p>Загрузка...</p>';
    
    modal.classList.remove('hidden');

    try {
        const data = await api.getLearnerProfile(learnerId);
        title.textContent = `Профиль: ${data.learner.full_name}`;
        renderGeneralTab(data.learner);
        renderSessionsTab(data.sessions);
        renderAuditTab(data.audit);
    } catch (error) {
        title.textContent = 'Ошибка';
        document.getElementById('profile-tab-general').innerHTML = `<p style="color: red;">${error.message}</p>`;
    }
}

export function initializeLearnerProfile() {
    const modal = document.getElementById('learner-profile-modal');
    if (!modal) return;

    const tabLinks = modal.querySelectorAll('.tab-link');
    const tabContents = modal.querySelectorAll('.profile-tab-content');

    document.getElementById('profile-modal-close-btn').addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    tabLinks.forEach(link => {
        link.addEventListener('click', () => {
            tabLinks.forEach(l => l.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            link.classList.add('active');
            document.getElementById(link.dataset.tab).classList.add('active');
        });
    });
}