import {
    DOMElements
} from '../dom.js';
import * as api from '../api.js';
import * as ui from '../ui.js';
import {
    state,
    updateState
} from '../state.js';
import {
    initializeDashboard
} from './dashboard.js';

let searchTimer;

function generateRandomPassword() {
    return Math.random().toString(36).slice(-8);
}

function openLearnerModal(mode, learnerId = null) {
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
        const text = e.target.result;
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length < 2) {
            return ui.showAlert('error', 'Ошибка', 'Файл пуст или имеет неверный формат.');
        }

        const headers = lines[0].split(',').map(h => h.trim());
        const learners = lines.slice(1).map(line => {
            const values = line.split(',');
            const learner = {};
            headers.forEach((header, index) => {
                learner[header] = values[index] ? values[index].trim() : '';
            });
            return learner;
        });

        if (await ui.showConfirm(`Подтверждение импорта`, `Найдено <b>${learners.length}</b> учащихся. Продолжить?`, 'Да, импортировать')) {
            try {
                const data = await api.importLearners(learners);
                ui.showAlert('success', 'Успех!', data.message);
                fetchLearners();
                initializeDashboard();
            } catch (error) {
                ui.showAlert('error', 'Ошибка импорта!', error.message);
            }
        }
    };
    reader.readAsText(file);
    DOMElements.csvFileInput.value = '';
}

async function exportLearnersToCSV() {
    try {
        const learners = await api.exportLearners();
        if (learners.length === 0) {
            return ui.showAlert('info', 'Информация', 'Нет данных для экспорта.');
        }

        const headers = Object.keys(learners[0]);
        const csvRows = [headers.join(',')];
        learners.forEach(learner => {
            const values = headers.map(header => `"${(learner[header] || '').toString().replace(/"/g, '""')}"`);
            csvRows.push(values.join(','));
        });

        const blob = new Blob([`\uFEFF${csvRows.join('\n')}`], {
            type: 'text/csv;charset=utf-8;'
        });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'learners_export.csv';
        link.click();
        URL.revokeObjectURL(link.href);
    } catch (error) {
        ui.showAlert('error', 'Ошибка экспорта!', error.message);
    }
}

function handleLearnerAction(e) {
    const target = e.target;
    const learnerId = target.closest('tr')?.dataset.learnerId;
    if (!learnerId) return;

    if (target.matches('.btn-edit')) {
        openLearnerModal('edit', learnerId);
    } else if (target.matches('.btn-delete')) {
        deleteLearner(learnerId);
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
        row.innerHTML = `
            <td><input type="checkbox" class="learner-checkbox" value="${learner.id}"></td>
            <td>${learner.full_name}</td>
            <td>${learner.group_name}</td>
            <td>${learner.login}</td>
            <td class="action-buttons">
                <button class="btn-secondary btn-edit">Ред.</button>
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
        if (groupToSearch) params.append('searchGroup', groupToSearch);
        if (state.currentSearchName) params.append('searchName', state.currentSearchName);

        const data = await api.getLearners(params);
        updateState({
            learners: data.learners || []
        });
        if (state.currentGroupName && data.learners && data.learners.length > 0) {
            const specialty = data.learners[0].specialty;
            if (specialty) {
                DOMElements.dashboardTitle.textContent = `Учащиеся группы №${state.currentGroupName} (${specialty})`;
            }
        }

        renderLearners(state.learners);
        const paginationContainer = document.querySelector('#pagination-container .pagination-wrapper');
        ui.renderPagination(data.totalPages, data.currentPage, paginationContainer, (page) => {
            updateState({
                currentPage: page
            });
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
            if (state.learners.length === 1 && state.currentPage > 1) {
                updateState({
                    currentPage: state.currentPage - 1
                });
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
    DOMElements.deleteSelectedBtn.textContent = `Удалить выбранных (${count})`;
    DOMElements.deleteSelectedBtn.classList.toggle('hidden', count === 0);
}

async function deleteSelectedLearners() {
    const ids = Array.from(document.querySelectorAll('.learner-checkbox:checked')).map(cb => cb.value);
    if (ids.length === 0) return;
    if (await ui.showConfirm(`Вы уверены?`, `Будет удалено ${ids.length} учащихся.`)) {
        try {
            const resData = await api.deleteMultipleLearners(ids);
            ui.showAlert('success', 'Удалено!', resData.message);
            initializeDashboard();
            fetchLearners();
        } catch (error) {
            ui.showAlert('error', 'Ошибка!', error.message);
        }
    }
}

export function initializeLearners() {
    DOMElements.addLearnerBtn.addEventListener('click', () => openLearnerModal('add'));
    DOMElements.cancelBtn.addEventListener('click', closeLearnerModal);
    DOMElements.learnerForm.addEventListener('submit', handleLearnerFormSubmit);
    DOMElements.importCsvBtn.addEventListener('click', () => DOMElements.csvFileInput.click());
    DOMElements.csvFileInput.addEventListener('change', handleFileImport);
    DOMElements.exportCsvBtn.addEventListener('click', exportLearnersToCSV);

    DOMElements.generatePasswordBtn.addEventListener('click', () => {
        const newPassword = generateRandomPassword();
        const passwordInput = DOMElements.learnerForm.elements['password'];
        passwordInput.value = newPassword;
        passwordInput.type = 'text';
        DOMElements.learnerForm.querySelector('.password-toggle-icon').classList.add('is-visible');
        setTimeout(() => {
            passwordInput.type = 'password';
            DOMElements.learnerForm.querySelector('.password-toggle-icon').classList.remove('is-visible');
        }, 3000);
    });

    DOMElements.learnerForm.querySelector('.password-toggle-icon').addEventListener('click', (e) => {
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

    DOMElements.importInstructionsBtn.addEventListener('click', () => {
        Swal.fire({
            title: 'Инструкция по импорту',
            icon: 'info',
            html: `
                <div style="text-align: left; padding: 10px;">
                    <h4>Шаг 1: Подготовка файла</h4>
                    <p>Для импорта требуется файл формата <strong>.csv</strong> с разделителем-запятой и в кодировке <strong>UTF-8</strong> (это важно для корректного отображения русских имен).</p>
                    
                    <h4>Шаг 2: Структура файла</h4>
                    <p>Первая строка файла должна содержать заголовки столбцов. Обязательные поля отмечены звездочкой (*):</p>
                    <ul>
                        <li><strong>fullName*</strong> - ФИО учащегося</li>
                        <li><strong>login*</strong> - Уникальный логин</li>
                        <li><strong>password*</strong> - Пароль для входа</li>
                        <li><strong>group_name*</strong> - Номер группы</li>
                        <li><strong>course</strong> - Курс (необязательно)</li>
                        <li><strong>specialty</strong> - Специальность (необязательно)</li>
                    </ul>

                    <h4>Шаг 3: Пример содержимого файла</h4>
                    <pre style="background-color: #f5f5f5; border-radius: 4px; padding: 10px; font-size: 12px; text-align: left;"><code>fullName,login,password,group_name,course,specialty
"Иванов Иван Иванович",ivanov,pass123,117,1,"Программное обеспечение"
"Петрова Мария Сергеевна",petrova,qwerty,258,2,"Бухгалтерский учет"</code></pre>

                    <h4>Рекомендуемые программы</h4>
                     <ul>
                        <li><strong>Google Sheets (Рекомендуется):</strong> Просто создайте таблицу и выберите "Файл" -> "Скачать" -> "Файл CSV". Кодировка будет правильной.</li>
                        <li><strong>Microsoft Excel:</strong> При сохранении выберите "Файл" -> "Сохранить как" и в поле "Тип файла" укажите <strong>"CSV UTF-8 (разделители - запятые)"</strong>.</li>
                    </ul>
                </div>
            `,
            confirmButtonText: 'Понятно',
        });
    });

    DOMElements.allLearnersBtn.addEventListener('click', () => {
        updateState({
            currentSearchName: '',
            currentSort: {
                key: 'full_name',
                direction: 'asc'
            },
            currentPage: 1,
            currentGroupName: null
        });
        DOMElements.searchInput.value = '';
        DOMElements.groupFilterSelect.value = '';
        ui.showLearnersView('Все');
        populateGroupFilter();
        fetchLearners();
    });

    DOMElements.backToGroupsBtn.addEventListener('click', () => {
        updateState({
            currentGroupName: null
        });
        ui.showGroupsView();
    });

    DOMElements.tableHead.addEventListener('click', (e) => {
        const th = e.target.closest('th');
        if (!th || !th.dataset.sortBy) return;
        const sortKey = th.dataset.sortBy;
        let direction = 'asc';
        if (state.currentSort.key === sortKey) {
            direction = state.currentSort.direction === 'asc' ? 'desc' : 'asc';
        }
        updateState({
            currentSort: {
                key: sortKey,
                direction
            },
            currentPage: 1
        });
        fetchLearners();
    });

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

    DOMElements.groupFilterSelect.addEventListener('change', () => {
        updateState({
            currentPage: 1,
            currentGroupName: DOMElements.groupFilterSelect.value
        });
        fetchLearners();
    });

    DOMElements.selectAllCheckbox.addEventListener('change', (e) => {
        document.querySelectorAll('.learner-checkbox').forEach(cb => cb.checked = e.target.checked);
        updateDeleteSelectedButtonState();
    });

    DOMElements.learnersTableBody.addEventListener('change', (e) => {
        if (e.target.classList.contains('learner-checkbox')) {
            updateDeleteSelectedButtonState();
            if (!e.target.checked) DOMElements.selectAllCheckbox.checked = false;
        }
    });

    DOMElements.deleteSelectedBtn.addEventListener('click', deleteSelectedLearners);
    DOMElements.learnersTableBody.addEventListener('click', handleLearnerAction);
}