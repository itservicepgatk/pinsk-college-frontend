import { DOMElements } from '../dom.js';
import * as api from '../api.js';
import * as ui from '../ui.js';
import { state, updateState } from '../state.js';
import { initializeDashboard } from './dashboard.js';
import { openLearnerProfile } from './learnerProfile.js';
import { initializeGroups } from './groups.js';

let searchTimer;

function generateRandomPassword() {
    return Math.random().toString(36).slice(-8);
}

// === СЛОВАРЬ ДЛЯ ПЕРЕВОДА ЗАГОЛОВКОВ EXCEL ===
const COLUMN_MAP = {
    'ФИО': 'fullName',
    'Логин': 'login',
    'Пароль': 'password',
    'Группа': 'group_name',
    'Курс': 'course',
    'Специальность': 'specialty',
    'Дата зачисления': 'enrollmentDate',
    'Расписание': 'sessionSchedule',
    'Задолженности': 'academicDebts'
};

// === ФУНКЦИЯ СКАЧИВАНИЯ ШАБЛОНА ===
function downloadExcelTemplate() {
    const templateData = [
        {
            'ФИО': 'Иванов Иван Иванович',
            'Логин': 'ivanov_ii',
            'Пароль': 'pass12345',
            'Группа': '117',
            'Курс': '1',
            'Специальность': 'Программное обеспечение',
            'Дата зачисления': '2024-09-01',
            'Расписание': '',
            'Задолженности': ''
        }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const wscols = [
        {wch: 30}, {wch: 15}, {wch: 15}, {wch: 10},
        {wch: 5}, {wch: 25}, {wch: 15}, {wch: 20}, {wch: 20}
    ];
    worksheet['!cols'] = wscols;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Шаблон импорта");
    XLSX.writeFile(workbook, "Шаблон_для_импорта_студентов.xlsx");
}

export function openLearnerModal(mode, learnerId = null) {
    DOMElements.learnerForm.reset();
    DOMElements.learnerForm.querySelector('#learner-id').value = '';

    if (mode === 'add') {
        DOMElements.modalTitle.textContent = 'Добавить учащегося';
        DOMElements.learnerForm.querySelector('label[for="password"]').textContent = 'Пароль:';
    } else if (mode === 'edit' && learnerId) {
        DOMElements.modalTitle.textContent = 'Редактировать учащегося';
        DOMElements.learnerForm.querySelector('label[for="password"]').textContent = 'Новый пароль (оставьте пустым, чтобы не менять):';
        const learner = state.learners.find(s => Number(s.id) === Number(learnerId));
        if (learner) {
            DOMElements.learnerForm.elements['learner-id'].value = learner.id;
            DOMElements.learnerForm.elements['fullName'].value = learner.full_name;
            DOMElements.learnerForm.elements['login'].value = learner.login;
            DOMElements.learnerForm.elements['group_name'].value = learner.group_name;
            DOMElements.learnerForm.elements['course'].value = learner.course;
            DOMElements.learnerForm.elements['specialty'].value = learner.specialty || '';
            DOMElements.learnerForm.elements['enrollmentDate'].value = learner.enrollment_date || '';
            DOMElements.learnerForm.elements['sessionSchedule'].value = learner.session_schedule || '';
            DOMElements.learnerForm.elements['academicDebts'].value = learner.academic_debts || '';
        } else {
            return ui.showAlert('error', 'Ошибка!', 'Не удалось найти данные учащегося.');
        }
    }
    DOMElements.modal.classList.remove('hidden');
}

function closeLearnerModal() {
    DOMElements.modal.classList.add('hidden');
}

async function handleLearnerFormSubmit(e) {
    e.preventDefault();
    const id = DOMElements.learnerForm.elements['learner-id'].value;
    const isEditing = !!id;

    const learnerData = {
        fullName: DOMElements.learnerForm.elements['fullName'].value,
        login: DOMElements.learnerForm.elements['login'].value,
        password: DOMElements.learnerForm.elements['password'].value,
        group_name: DOMElements.learnerForm.elements['group_name'].value,
        course: DOMElements.learnerForm.elements['course'].value,
        specialty: DOMElements.learnerForm.elements['specialty'].value,
        enrollmentDate: DOMElements.learnerForm.elements['enrollmentDate'].value,
        sessionSchedule: DOMElements.learnerForm.elements['sessionSchedule'].value,
        academicDebts: DOMElements.learnerForm.elements['academicDebts'].value
    };
    if (!learnerData.password) {
        delete learnerData.password;
    }

    try {
        const updatedLearner = isEditing ?
            await api.updateLearner(id, learnerData) :
            await api.createLearner(learnerData);

        closeLearnerModal();
        ui.showAlert('success', 'Сохранено!', 'Данные учащегося успешно обновлены.');
        
        initializeDashboard();
        initializeGroups();
        fetchLearners();
        
    } catch (error) {
        ui.showAlert('error', 'Ошибка!', error.message);
    }
}

async function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    
    reader.onload = async (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            if (jsonData.length === 0) throw new Error('Файл пуст.');

            const learners = jsonData.map(row => {
                const learner = {};
                for (const [rusKey, engKey] of Object.entries(COLUMN_MAP)) {
                    const value = row[rusKey] || row[Object.keys(row).find(k => k.trim().toLowerCase() === rusKey.toLowerCase())];
                    if (value !== undefined) {
                        learner[engKey] = String(value).trim();
                    }
                }
                if (!learner.fullName && row.fullName) learner.fullName = row.fullName;
                if (!learner.login && row.login) learner.login = row.login;
                if (!learner.password && row.password) learner.password = row.password;
                if (!learner.group_name && row.group_name) learner.group_name = row.group_name;
                return learner;
            });

            const validLearners = learners.filter(l => l.fullName && l.login && l.group_name);

            if (validLearners.length === 0) {
                throw new Error('Не найдено корректных данных.');
            }

            if (await ui.showConfirm(`Подтверждение импорта`, `Найдено <b>${validLearners.length}</b> учащихся. Продолжить?`, 'Да, импортировать')) {
                ui.showLoading('Импорт данных...');
                const data = await api.importLearners(validLearners);
                ui.closeLoading();
                ui.showAlert('success', 'Успех!', data.message);
                
                initializeDashboard();
                initializeGroups();
                fetchLearners();
            }
        } catch (error) {
            ui.closeLoading();
            ui.showAlert('error', 'Ошибка импорта!', error.message);
        }
    };
    reader.readAsArrayBuffer(file);
    DOMElements.csvFileInput.value = '';
}

async function exportLearnersToCSV() {
    try {
        const learners = await api.exportLearners();
        if (learners.length === 0) {
            return ui.showAlert('info', 'Информация', 'Нет данных для экспорта.');
        }
        const worksheet = XLSX.utils.json_to_sheet(learners);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Учащиеся");
        XLSX.writeFile(workbook, "Экспорт_учащихся.xlsx");
    } catch (error) {
        ui.showAlert('error', 'Ошибка экспорта!', error.message);
    }
}

function handleLearnerAction(e) {
    const target = e.target;
    
    // Если клик по чекбоксу - ничего не делаем, он сам переключится
    if (target.classList.contains('learner-checkbox')) {
        updateDeleteSelectedButtonState();
        return;
    }

    // Если клик по кнопке или ссылке - обрабатываем
    const learnerId = target.closest('tr')?.dataset.learnerId;
    if (!learnerId) return;

    if (target.matches('.learner-name-link')) {
        e.preventDefault();
        openLearnerProfile(learnerId);
    } else if (target.matches('.btn-delete')) {
        e.preventDefault();
        deleteLearner(learnerId);
    } else {
        // Если клик просто по строке - переключаем чекбокс
        const checkbox = target.closest('tr').querySelector('.learner-checkbox');
        if (checkbox) {
            checkbox.checked = !checkbox.checked;
            updateDeleteSelectedButtonState();
        }
    }
}

export async function populateGroupFilter() {
    try {
        const groups = await api.getGroups();
        const currentFilterValue = DOMElements.groupFilterSelect.value;
        DOMElements.groupFilterSelect.innerHTML = '<option value="">-- Все группы --</option>';
        groups.forEach(group => {
            const option = document.createElement('option');
            option.value = group.group_name;
            option.textContent = `Группа ${group.group_name}`;
            DOMElements.groupFilterSelect.appendChild(option);
        });
        DOMElements.groupFilterSelect.value = currentFilterValue;
    } catch (error) {
        console.error(error.message);
        DOMElements.groupFilterSelect.innerHTML = '<option value="">Ошибка загрузки</option>';
    }
}

function renderLearners(learnersToRender) {
    const learnersArray = learnersToRender || [];
    DOMElements.learnersTableBody.innerHTML = '';
    DOMElements.selectAllCheckbox.checked = false;

    learnersArray.forEach(learner => {
        const row = document.createElement('tr');
        row.dataset.learnerId = learner.id;
        // Добавляем cursor: pointer для строки, чтобы было понятно, что можно кликать
        row.style.cursor = 'pointer';
        row.innerHTML = `
            <td><input type="checkbox" class="learner-checkbox" value="${learner.id}"></td>
            <td><a href="#" class="learner-name-link">${learner.full_name || 'Имя не указано'}</a></td>
            <td>${learner.group_name || 'Без группы'}</td>
            <td>${learner.login}</td>
            <td class="action-buttons">
                <button class="btn-danger btn-delete">Удал.</button>
            </td>
        `;
        DOMElements.learnersTableBody.appendChild(row);
    });
    updateDeleteSelectedButtonState();
}

export async function fetchLearners() {
    try {
        const params = new URLSearchParams({
            page: state.currentPage,
            limit: 10,
            sortBy: state.currentSort.key,
            sortDir: state.currentSort.direction,
        });
        const groupToSearch = DOMElements.groupFilterSelect.value || state.currentGroupName;
            if (groupToSearch && groupToSearch !== '') {
             params.append('searchGroup', groupToSearch);
            }
        else if (groupToSearch === null) {
             params.append('searchGroup', 'null');
        }

        if (state.currentSearchName) params.append('searchName', state.currentSearchName);

        const data = await api.getLearners(params);
        updateState({ learners: data.learners || [] });
        
        if (state.currentGroupName && data.learners && data.learners.length > 0) {
            const specialty = data.learners[0].specialty;
            if (specialty) {
                DOMElements.dashboardTitle.textContent = `Учащиеся группы №${state.currentGroupName} (${specialty})`;
            }
        }

        renderLearners(state.learners);
        const paginationContainer = document.querySelector('#pagination-container .pagination-wrapper');
        ui.renderPagination(data.totalPages, data.currentPage, paginationContainer, (page) => {
            updateState({ currentPage: page });
            fetchLearners();
        });
        ui.updateSortIndicators(state.currentSort);
    } catch (error) {
        ui.showAlert('error', 'Ошибка!', error.message);
    }
}

async function deleteLearner(id) {
    if (await ui.showConfirm('Вы уверены?', 'Это действие нельзя будет отменить!')) {
        try {
            await api.deleteLearner(id);
            ui.showAlert('success', 'Удалено!', 'Данные учащегося были успешно удалены.');
            
            initializeDashboard();
            initializeGroups();
            
            if (state.learners.length === 1 && state.currentPage > 1) {
                updateState({ currentPage: state.currentPage - 1 });
            }
            fetchLearners();
        } catch (error) {
            ui.showAlert('error', 'Ошибка!', error.message);
        }
    }
}

function updateDeleteSelectedButtonState() {
    const selected = document.querySelectorAll('.learner-checkbox:checked');
    const count = selected.length;
    if (DOMElements.deleteSelectedBtn) {
        DOMElements.deleteSelectedBtn.textContent = `Удалить выбранных (${count})`;
        DOMElements.deleteSelectedBtn.classList.toggle('hidden', count === 0);
    }
}

async function deleteSelectedLearners() {
    const ids = Array.from(document.querySelectorAll('.learner-checkbox:checked')).map(cb => cb.value);
    if (ids.length === 0) return;
    if (await ui.showConfirm(`Вы уверены?`, `Будет удалено ${ids.length} учащихся.`)) {
        try {
            const resData = await api.deleteMultipleLearners(ids);
            ui.showAlert('success', 'Удалено!', resData.message);
            
            initializeDashboard();
            initializeGroups();
            fetchLearners();
            
        } catch (error) {
            ui.showAlert('error', 'Ошибка!', error.message);
        }
    }
}

export function initializeLearners() {
    if (DOMElements.addLearnerBtn) {
        DOMElements.addLearnerBtn.addEventListener('click', () => openLearnerModal('add'));
    }
    
    if (DOMElements.cancelBtn) {
        DOMElements.cancelBtn.addEventListener('click', closeLearnerModal);
    }
    
    if (DOMElements.learnerForm) {
        DOMElements.learnerForm.addEventListener('submit', handleLearnerFormSubmit);
    }
    
    if (DOMElements.importCsvBtn && DOMElements.csvFileInput) {
        DOMElements.importCsvBtn.addEventListener('click', () => DOMElements.csvFileInput.click());
        DOMElements.csvFileInput.addEventListener('change', handleFileImport);
    }
    
    if (DOMElements.exportCsvBtn) {
        DOMElements.exportCsvBtn.addEventListener('click', exportLearnersToCSV);
    }

    if (DOMElements.downloadTemplateBtn) {
        DOMElements.downloadTemplateBtn.addEventListener('click', downloadExcelTemplate);
    }

    if (DOMElements.generatePasswordBtn) {
        DOMElements.generatePasswordBtn.addEventListener('click', () => {
            const newPassword = generateRandomPassword();
            const passwordInput = DOMElements.learnerForm.elements['password'];
            passwordInput.value = newPassword;
            passwordInput.type = 'text';
            const icon = DOMElements.learnerForm.querySelector('.password-toggle-icon');
            if (icon) {
                icon.classList.add('is-visible');
                setTimeout(() => {
                    passwordInput.type = 'password';
                    icon.classList.remove('is-visible');
                }, 3000);
            }
        });
    }

    const passIcon = DOMElements.learnerForm?.querySelector('.password-toggle-icon');
    if (passIcon) {
        passIcon.addEventListener('click', (e) => {
            const icon = e.target;
            const passwordInput = DOMElements.learnerForm.elements['password'];
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                icon.classList.add('is-visible');
            } else {
                passwordInput.type = 'password';
                icon.classList.remove('is-visible');
            }
        });
    }

    if (DOMElements.importInstructionsBtn) {
        DOMElements.importInstructionsBtn.addEventListener('click', () => {
            Swal.fire({
                title: 'Как загрузить студентов',
                icon: 'info',
                html: `
                    <div style="text-align: left; padding: 10px;">
                        <p>1. Нажмите кнопку <b><i class="fa-solid fa-file-excel"></i> Шаблон</b>.</p>
                        <p>2. Заполните таблицу в Excel.</p>
                        <p>3. Нажмите <b>Импорт</b> и выберите файл.</p>
                    </div>
                `,
                confirmButtonText: 'Понятно',
            });
        });
    }

    if (DOMElements.allLearnersBtn) {
        DOMElements.allLearnersBtn.addEventListener('click', () => {
            updateState({
                currentSearchName: '',
                currentSort: { key: 'full_name', direction: 'asc' },
                currentPage: 1,
                currentGroupName: ''
            });
            DOMElements.searchInput.value = '';
            DOMElements.groupFilterSelect.value = ''; 
            ui.showLearnersView('Все');
            populateGroupFilter().then(() => {
                 DOMElements.groupFilterSelect.value = ''; 
            });
            fetchLearners();
        });
    }

    if (DOMElements.backToGroupsBtn) {
        DOMElements.backToGroupsBtn.addEventListener('click', () => {
            updateState({ currentGroupName: null });
            ui.showGroupsView();
        });
    }

    if (DOMElements.tableHead) {
        DOMElements.tableHead.addEventListener('click', (e) => {
            const th = e.target.closest('th');
            if (!th || !th.dataset.sortBy) return;
            const sortKey = th.dataset.sortBy;
            let direction = 'asc';
            if (state.currentSort.key === sortKey) {
                direction = state.currentSort.direction === 'asc' ? 'desc' : 'asc';
            }
            updateState({
                currentSort: { key: sortKey, direction },
                currentPage: 1
            });
            fetchLearners();
        });
    }

    if (DOMElements.searchInput) {
        DOMElements.searchInput.addEventListener('input', () => {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => {
                updateState({
                    currentSearchName: DOMElements.searchInput.value,
                    currentPage: 1
                });
                fetchLearners();
            }, 300);
        });
    }

    if (DOMElements.groupFilterSelect) {
        DOMElements.groupFilterSelect.addEventListener('change', () => {
            updateState({
                currentPage: 1,
                currentGroupName: DOMElements.groupFilterSelect.value
            });
            fetchLearners();
        });
    }

    if (DOMElements.selectAllCheckbox) {
        DOMElements.selectAllCheckbox.addEventListener('change', (e) => {
            document.querySelectorAll('.learner-checkbox').forEach(cb => cb.checked = e.target.checked);
            updateDeleteSelectedButtonState();
        });
    }

    if (DOMElements.learnersTableBody) {
        // Убрали 'change', так как теперь 'click' обрабатывает всё
        DOMElements.learnersTableBody.addEventListener('click', handleLearnerAction);
    }

    if (DOMElements.deleteSelectedBtn) {
        DOMElements.deleteSelectedBtn.addEventListener('click', deleteSelectedLearners);
    }
}