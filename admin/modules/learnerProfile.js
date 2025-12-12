import { DOMElements } from '../dom.js';
import * as api from '../api.js';
import { openLearnerModal } from './learners.js';

function renderGeneralTab(learner) {
    const container = document.getElementById('profile-tab-general');
    
    // Используем красивую верстку с сеткой
    container.innerHTML = `
        <div style="padding: 20px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                <div class="form-group-modal">
                    <label>ФИО</label>
                    <div style="padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">${learner.full_name}</div>
                </div>
                <div class="form-group-modal">
                    <label>Логин</label>
                    <div style="padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">${learner.login}</div>
                </div>
                <div class="form-group-modal">
                    <label>Группа</label>
                    <div style="padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">${learner.group_name}</div>
                </div>
                <div class="form-group-modal">
                    <label>Курс</label>
                    <div style="padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">${learner.course}</div>
                </div>
                <div class="form-group-modal grid-col-span-2">
                    <label>Специальность</label>
                    <div style="padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">${learner.specialty || 'Не указано'}</div>
                </div>
                <div class="form-group-modal grid-col-span-2">
                    <label>Дата зачисления</label>
                    <div style="padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">${learner.enrollment_date || 'Не указано'}</div>
                </div>
                <div class="form-group-modal grid-col-span-2">
                    <label>Расписание сессий</label>
                    <div style="padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; white-space: pre-wrap;">${learner.session_schedule || 'Нет данных'}</div>
                </div>
                <div class="form-group-modal grid-col-span-2">
                    <label>Академические задолженности</label>
                    <div style="padding: 10px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; color: #ef4444; white-space: pre-wrap;">${learner.academic_debts || 'Отсутствуют'}</div>
                </div>
            </div>
            
            <div style="text-align: right; border-top: 1px solid #e2e8f0; padding-top: 20px;">
                <button id="profile-edit-btn" class="btn-primary">Редактировать профиль</button>
            </div>
        </div>
    `;

    document.getElementById('profile-edit-btn').addEventListener('click', () => {
        document.getElementById('learner-profile-modal').classList.add('hidden');
        openLearnerModal('edit', learner.id);
    });
}

function renderSessionsTab(sessions) {
    const container = document.getElementById('profile-tab-sessions');
    container.style.padding = "20px";
    
    if (!sessions || sessions.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #64748b;">История входов в систему пуста.</p>';
        return;
    }
    const rows = sessions.map(s => `
        <tr>
            <td>${new Date(s.login_time).toLocaleString('ru-RU')}</td>
            <td>${s.logout_time ? new Date(s.logout_time).toLocaleString('ru-RU') : '<span style="color: green;">Активна</span>'}</td>
            <td>${s.ip_address}</td>
            <td style="font-size: 12px; color: #64748b;">${s.user_agent}</td>
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
    container.style.padding = "20px";

    if (!auditLogs || auditLogs.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #64748b;">История изменений этого профиля пуста.</p>';
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
    
    // Сброс вкладок
    document.querySelectorAll('.profile-tab-content').forEach(el => el.classList.remove('active'));
    document.getElementById('profile-tab-general').classList.add('active');
    document.querySelectorAll('.tab-link').forEach(el => el.classList.remove('active'));
    document.querySelector('.tab-link[data-tab="profile-tab-general"]').classList.add('active');

    document.getElementById('profile-tab-general').innerHTML = '<div class="loader"></div>';
    
    modal.classList.remove('hidden');

    try {
        const data = await api.getLearnerProfile(learnerId);
        title.textContent = `Профиль: ${data.learner.full_name}`;
        renderGeneralTab(data.learner);
        renderSessionsTab(data.sessions);
        renderAuditTab(data.audit);
    } catch (error) {
        title.textContent = 'Ошибка';
        document.getElementById('profile-tab-general').innerHTML = `<p style="color: red; text-align: center; padding: 20px;">${error.message}</p>`;
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