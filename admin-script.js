const API_URL = 'https://pinsk-college-backend.onrender.com';
let learners = [];
let token = localStorage.getItem('adminToken');
let currentPage = 1;
let currentSort = { key: 'full_name', direction: 'asc' };
let currentSearchName = '';
let currentGroupName = null;
let searchTimer;
let inactivityTimer;
const INACTIVITY_TIMEOUT = 5 * 60 * 1000;

const adminLoginContainer = document.getElementById('admin-login-container');
const dashboardContainer = document.getElementById('dashboard-container');
const adminLoginForm = document.getElementById('admin-login-form');
const adminLoader = document.getElementById('admin-loader');
const adminErrorMessage = document.getElementById('admin-error-message');
const logoutButton = document.getElementById('logout-button');
const learnersTableBody = document.getElementById('learners-table-body');
const addLearnerBtn = document.getElementById('add-learner-btn');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const learnerForm = document.getElementById('learner-form');
const cancelBtn = document.getElementById('cancel-btn');
const searchInput = document.getElementById('search-input');
const tableHead = document.getElementById('table-head');
const dashboardTitle = document.getElementById('dashboard-title');
const groupsView = document.getElementById('groups-view');
const learnersView = document.getElementById('learners-view');
const groupsContainer = document.getElementById('groups-container');
const backToGroupsBtn = document.getElementById('back-to-groups-btn');
const allLearnersBtn = document.getElementById('all-learners-btn');
const totalLearnersStat = document.getElementById('total-learners-stat');
const debtorsCountStat = document.getElementById('debtors-count-stat');
const detailsBtn = document.getElementById('details-btn');
const detailsModal = document.getElementById('details-modal');
const detailsModalCloseBtn = document.getElementById('details-modal-close-btn');
const groupsStatsTableBody = document.getElementById('groups-stats-table-body');
const groupEditorBtn = document.getElementById('group-editor-btn');
const groupEditorModal = document.getElementById('group-editor-modal');
const groupEditorCloseBtn = document.getElementById('group-editor-close-btn');
const groupEditorCancelBtn = document.getElementById('group-editor-cancel-btn');
const groupEditorForm = document.getElementById('group-editor-form');
const groupSelect = document.getElementById('group-select');
const incrementCourseBtn = document.getElementById('increment-course-btn');
const copyScheduleBtn = document.getElementById('copy-schedule-btn');
const newGroupNameInput = document.getElementById('new-group-name');
const decrementCourseBtn = document.getElementById('decrement-course-btn');

function handleInactivity() {
    if (localStorage.getItem('adminToken')) {
        Swal.fire({
            title: 'Сессия завершена',
            text: 'Вы были неактивны в течение 5 минут. Пожалуйста, войдите снова.',
            icon: 'warning',
            confirmButtonText: 'OK'
        }).then(() => {
            logoutButton.click();
        });
    }
}

function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(handleInactivity, INACTIVITY_TIMEOUT);
}

function renderLearners(learnersToRender) {
    const learnersArray = learnersToRender || [];
    learnersTableBody.innerHTML = '';
    learnersArray.forEach(learner => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${learner.full_name}</td>
            <td>${learner.group_name}</td>
            <td>${learner.login}</td>
            <td class="action-buttons">
                <button class="btn-secondary" onclick="editLearner(${learner.id})">Ред.</button>
                <button class="btn-danger" onclick="deleteLearner(${learner.id})">Удал.</button>
            </td>
        `;
        learnersTableBody.appendChild(row);
    });
}

async function fetchLearners() {
    try {
        const params = new URLSearchParams({
            page: currentPage,
            limit: 10,
            sortBy: currentSort.key,
            sortDir: currentSort.direction,
        });
        if (currentGroupName) {
            params.append('searchGroup', currentGroupName);
        }
        if (currentSearchName) {
            params.append('searchName', currentSearchName);
        }
        const response = await fetch(`${API_URL}/api/learners?${params.toString()}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Не удалось загрузить данные учащихся');
        const data = await response.json();
        learners = data.learners || [];
        renderLearners(learners);
        renderPagination(data.totalPages, data.currentPage);
        updateSortIndicators();
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Ошибка!', text: error.message });
    }
}

function updateSortIndicators() {
    document.querySelectorAll('#table-head th[data-sort-by]').forEach(th => {
        th.classList.remove('asc', 'desc');
        if (th.dataset.sortBy === currentSort.key) {
            th.classList.add(currentSort.direction);
        }
    });
}

function renderPagination(totalPages, pageToRender) {
    const paginationContainer = document.getElementById('pagination-container');
    paginationContainer.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
        const button = document.createElement('button');
        button.textContent = i;
        if (i === pageToRender) {
            button.classList.add('active');
        }
        button.addEventListener('click', () => {
            currentPage = i;
            fetchLearners();
        });
        paginationContainer.appendChild(button);
    }
}

function showView(view) {
    adminLoginContainer.classList.add('hidden');
    dashboardContainer.classList.add('hidden');
    document.getElementById(view).classList.remove('hidden');
    if (view === 'admin-login-container') {
        document.body.classList.add('login-view');
    } else {
        document.body.classList.remove('login-view');
    }
}

function showGroupsView() {
    dashboardTitle.textContent = 'Группы';
    learnersView.classList.add('hidden');
    groupsView.classList.remove('hidden');
}

function showLearnersView(groupName) {
    dashboardTitle.textContent = groupName === 'Все' ? 'Все учащиеся' : `Учащиеся группы №${groupName}`;
    groupsView.classList.add('hidden');
    learnersView.classList.remove('hidden');
}

async function fetchAndRenderGroups() {
    try {
        const response = await fetch(`${API_URL}/api/stats/groups`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Не удалось загрузить список групп');
        const groupsData = await response.json();
        groupsContainer.innerHTML = '';
        groupsData.forEach(group => {
            const folder = document.createElement('div');
            folder.className = 'folder';
            folder.innerHTML = `
                <div class="folder-icon">📁</div>
                <div class="folder-name">Группа ${group.group_name}</div>
                <div class="folder-count">Учащихся: ${group.learner_count}</div>
            `;
            folder.addEventListener('click', () => {
                currentSort.key = 'full_name';
                currentSort.direction = 'asc';
                currentPage = 1;
                currentGroupName = group.group_name;
                currentSearchName = '';
                searchInput.value = '';
                showLearnersView(group.group_name);
                fetchLearners();
            });
            groupsContainer.appendChild(folder);
        });
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Ошибка!', text: error.message });
    }
}

async function fetchDashboardStats() {
    try {
        const response = await fetch(`${API_URL}/api/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Не удалось загрузить статистику');
        const stats = await response.json();
        totalLearnersStat.textContent = stats.totalLearners;
        debtorsCountStat.textContent = stats.debtorsCount;
    } catch (error) {
        console.error(error.message);
        totalLearnersStat.textContent = '—';
        debtorsCountStat.textContent = '—';
    }
}

function validateForm() {
    const fields = learnerForm.querySelectorAll('input, textarea');
    fields.forEach(field => field.classList.remove('invalid'));
    let isValid = true;
    let errorMessage = '';
    const fullName = document.getElementById('fullName').value.trim();
    const login = document.getElementById('login').value.trim();
    const password = document.getElementById('password').value;
    const group_name = document.getElementById('group_name').value.trim();
    if (!fullName) {
        isValid = false;
        document.getElementById('fullName').classList.add('invalid');
        errorMessage = 'Поле ФИО не может быть пустым.';
    } else if (!login) {
        isValid = false;
        document.getElementById('login').classList.add('invalid');
        errorMessage = 'Поле Логин не может быть пустым.';
    } else if (!group_name) {
        isValid = false;
        document.getElementById('group_name').classList.add('invalid');
        errorMessage = 'Поле Группа не может быть пустым.';
    }
    const isEditing = !!document.getElementById('learner-id').value;
    if (!isEditing && !password) {
        isValid = false;
        document.getElementById('password').classList.add('invalid');
        errorMessage = 'При создании нового учащегося пароль обязателен.';
    } else if (password && password.length < 6) {
        isValid = false;
        document.getElementById('password').classList.add('invalid');
        errorMessage = 'Пароль должен содержать не менее 6 символов.';
    }
    if (!isValid) {
        Swal.fire({
            icon: 'error',
            title: 'Ошибка валидации',
            text: errorMessage,
        });
    }
    return isValid;
}

function openModal(mode, learnerId = null) {
    learnerForm.reset();
    document.getElementById('learner-id').value = '';
    if (mode === 'add') {
        modalTitle.textContent = 'Добавить учащегося';
        document.querySelector('label[for="password"]').textContent = 'Пароль:';
    } else if (mode === 'edit') {
        modalTitle.textContent = 'Редактировать учащегося';
        document.querySelector('label[for="password"]').textContent = 'Новый пароль (оставьте пустым, чтобы не менять):';
        const learner = learners.find(s => Number(s.id) === Number(learnerId));
        if (learner) {
            document.getElementById('learner-id').value = learner.id;
            document.getElementById('fullName').value = learner.full_name;
            document.getElementById('login').value = learner.login;
            document.getElementById('group_name').value = learner.group_name;
            document.getElementById('course').value = learner.course;
            document.getElementById('specialty').value = learner.specialty || '';
            document.getElementById('enrollmentDate').value = learner.enrollment_date || '';
            document.getElementById('sessionSchedule').value = learner.session_schedule || '';
            document.getElementById('academicDebts').value = learner.academic_debts || '';
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Ошибка!',
                text: 'Не удалось найти данные учащегося для редактирования.',
            });
            return;
        }
    }
    modal.classList.remove('hidden');
}

function closeModal() {
    modal.classList.add('hidden');
}

window.editLearner = (id) => {
    openModal('edit', id);
};

window.deleteLearner = async (id) => {
    const result = await Swal.fire({
        title: 'Вы уверены?',
        text: "Это действие нельзя будет отменить!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Да, удалить!',
        cancelButtonText: 'Отмена'
    });
    if (result.isConfirmed) {
        try {
            const response = await fetch(`${API_URL}/api/learners/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Ошибка при удалении');
            Swal.fire('Удалено!', 'Данные учащегося были успешно удалены.', 'success');
            fetchDashboardStats();
            if (learners.length === 1 && currentPage > 1) {
                currentPage = currentPage - 1;
            }
            fetchLearners();
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Ошибка!', text: error.message });
        }
    }
};

adminLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    adminErrorMessage.textContent = '';
    adminLoader.classList.remove('hidden');
    const login = document.getElementById('admin-login').value;
    const password = document.getElementById('admin-password').value;
    try {
        const response = await fetch(`${API_URL}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login, password })
        });
        if (!response.ok) {
            if (response.status === 429) {
                const errorMessageText = await response.text();
                throw new Error(errorMessageText);
            }
            const err = await response.json();
            throw new Error(err.message);
        }
        const data = await response.json();
        token = data.token;
        localStorage.setItem('adminToken', token);
        resetInactivityTimer();
        showView('dashboard-container');
        showGroupsView();
        fetchAndRenderGroups();
        fetchDashboardStats();
    } catch (error) {
        adminErrorMessage.textContent = error.message;
    } finally {
        adminLoader.classList.add('hidden');
    }
});

logoutButton.addEventListener('click', () => {
    clearTimeout(inactivityTimer);
    token = null;
    localStorage.removeItem('adminToken');
    showView('admin-login-container');
});

addLearnerBtn.addEventListener('click', () => {
    openModal('add');
});

cancelBtn.addEventListener('click', closeModal);

learnerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateForm()) {
        return;
    }
    const id = document.getElementById('learner-id').value;
    const learnerData = {
        fullName: document.getElementById('fullName').value,
        login: document.getElementById('login').value,
        password: document.getElementById('password').value,
        group_name: document.getElementById('group_name').value,
        course: document.getElementById('course').value,
        specialty: document.getElementById('specialty').value,
        enrollmentDate: document.getElementById('enrollmentDate').value,
        sessionSchedule: document.getElementById('sessionSchedule').value,
        academicDebts: document.getElementById('academicDebts').value
    };
    if (!learnerData.password) {
        delete learnerData.password;
    }
    const isEditing = !!id;
    const url = isEditing ? `${API_URL}/api/learners/${id}` : `${API_URL}/api/learners`;
    const method = isEditing ? 'PUT' : 'POST';
    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(learnerData)
        });
        if (!response.ok) throw new Error('Ошибка при сохранении данных');
        closeModal();
        fetchDashboardStats();
        fetchLearners();
        Swal.fire({
            icon: 'success',
            title: 'Сохранено!',
            text: 'Данные учащегося успешно обновлены.',
            showConfirmButton: false,
            timer: 1500
        });
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Ошибка!', text: error.message });
    }
});

detailsBtn.addEventListener('click', async () => {
    try {
        const response = await fetch(`${API_URL}/api/stats/groups`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Не удалось загрузить статистику по группам');
        const groupsData = await response.json();
        groupsStatsTableBody.innerHTML = '';
        groupsData.forEach(group => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${group.group_name}</td>
                <td>${group.learner_count}</td>
            `;
            groupsStatsTableBody.appendChild(row);
        });
        detailsModal.classList.remove('hidden');
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Ошибка!', text: error.message });
    }
});

detailsModalCloseBtn.addEventListener('click', () => {
    detailsModal.classList.add('hidden');
});

allLearnersBtn.addEventListener('click', () => {
    currentSearchName = '';
    searchInput.value = '';
    currentSort.key = 'full_name';
    currentSort.direction = 'asc';
    currentPage = 1;
    currentGroupName = null;
    showLearnersView('Все');
    fetchLearners();
});

backToGroupsBtn.addEventListener('click', () => {
    currentGroupName = null;
    showGroupsView();
});

tableHead.addEventListener('click', (e) => {
    const th = e.target.closest('th');
    if (!th || !th.dataset.sortBy) return;
    const sortKey = th.dataset.sortBy;
    if (currentSort.key === sortKey) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.key = sortKey;
        currentSort.direction = 'asc';
    }
    currentPage = 1;
    fetchLearners();
});

searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        currentSearchName = searchInput.value;
        currentPage = 1;
        fetchLearners();
    }, 300);
});

groupEditorBtn.addEventListener('click', async () => {
    groupEditorForm.reset();
    groupSelect.innerHTML = '<option value="">-- Загрузка... --</option>';
    groupEditorModal.classList.remove('hidden');
    try {
        const response = await fetch(`${API_URL}/api/stats/groups`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Не удалось загрузить список групп');
        const groups = await response.json();
        groupSelect.innerHTML = '<option value="">-- Выберите группу --</option>';
        groups.forEach(group => {
            const option = document.createElement('option');
            option.value = group.group_name;
            option.textContent = `Группа ${group.group_name} (${group.learner_count} чел.)`;
            groupSelect.appendChild(option);
        });
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Ошибка!', text: error.message });
        groupEditorModal.classList.add('hidden');
    }
});

const closeGroupEditor = () => groupEditorModal.classList.add('hidden');
groupEditorCloseBtn.addEventListener('click', closeGroupEditor);
groupEditorCancelBtn.addEventListener('click', closeGroupEditor);

groupEditorForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const group_name = groupSelect.value;
    if (!group_name) {
        Swal.fire('Ошибка', 'Пожалуйста, выберите группу.', 'warning');
        return;
    }
    const updates = {};
    const course = document.getElementById('group-course').value;
    const specialty = document.getElementById('group-specialty').value;
    const sessionSchedule = document.getElementById('group-sessionSchedule').value;
    const academicDebts = document.getElementById('group-academicDebts').value;
    if (course) updates.course = course;
    if (specialty) updates.specialty = specialty;
    if (sessionSchedule) updates.session_schedule = sessionSchedule;
    if (academicDebts) updates.academic_debts = academicDebts;
    const new_group_name = newGroupNameInput.value.trim();
    if (Object.keys(updates).length === 0 && !new_group_name) {
        Swal.fire('Информация', 'Вы не заполнили ни одного поля для обновления.', 'info');
        return;
    }
    const requestBody = { group_name, updates };
    if (new_group_name) {
        requestBody.new_group_name = new_group_name;
    }
    const result = await Swal.fire({
        title: `Подтвердите изменения для группы ${group_name}`,
        text: 'Это действие затронет всех учащихся в выбранной группе!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Да, обновить!',
        cancelButtonText: 'Отмена'
    });
    if (result.isConfirmed) {
        try {
            const response = await fetch(`${API_URL}/api/groups/update`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(requestBody)
            });
            const resData = await response.json();
            if (!response.ok) throw new Error(resData.message);
            Swal.fire('Успех!', resData.message, 'success');
            closeGroupEditor();
            fetchDashboardStats();
            fetchAndRenderGroups();
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Ошибка!', text: error.message });
        }
    }
});

incrementCourseBtn.addEventListener('click', async () => {
    const group_name = groupSelect.value;
    if (!group_name) {
        Swal.fire('Ошибка', 'Сначала выберите группу.', 'warning');
        return;
    }
    let currentCourse = 0;
    try {
        const params = new URLSearchParams({ searchGroup: group_name, limit: 1 });
        const response = await fetch(`${API_URL}/api/learners?${params.toString()}`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await response.json();
        if (data.learners && data.learners.length > 0) {
            currentCourse = data.learners[0].course;
        }
    } catch (e) {
        Swal.fire('Ошибка', 'Не удалось определить текущий курс группы.', 'error');
        return;
    }
    const nextCourse = currentCourse + 1;
    const result = await Swal.fire({
        title: `Перевести группу ${group_name} на ${nextCourse} курс?`,
        text: 'Это действие обновит поле "Курс" у всех учащихся группы.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Да, перевести!',
        cancelButtonText: 'Отмена'
    });
    if (result.isConfirmed) {
        const updates = { course: nextCourse };
        try {
            const response = await fetch(`${API_URL}/api/groups/update`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ group_name, updates })
            });
            const resData = await response.json();
            if (!response.ok) throw new Error(resData.message);
            Swal.fire('Успех!', resData.message, 'success');
            closeGroupEditor();
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Ошибка!', text: error.message });
        }
    }
});

decrementCourseBtn.addEventListener('click', async () => {
    const group_name = groupSelect.value;
    if (!group_name) {
        Swal.fire('Ошибка', 'Сначала выберите группу.', 'warning');
        return;
    }
    let currentCourse = 0;
    try {
        const params = new URLSearchParams({ searchGroup: group_name, limit: 1 });
        const response = await fetch(`${API_URL}/api/learners?${params.toString()}`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await response.json();
        if (data.learners && data.learners.length > 0) {
            currentCourse = data.learners[0].course;
        }
    } catch (e) { }
    const prevCourse = currentCourse - 1;
    if (prevCourse < 1) {
        Swal.fire('Внимание', 'Курс не может быть меньше 1.', 'info');
        return;
    }
    const result = await Swal.fire({
        title: `Понизить курс группы ${group_name} до ${prevCourse}?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Да, понизить!',
        cancelButtonText: 'Отмена'
    });
    if (result.isConfirmed) {
        const updates = { course: prevCourse };
        try {
            const response = await fetch(`${API_URL}/api/groups/update`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ group_name, updates })
            });
            const resData = await response.json();
            if (!response.ok) throw new Error(resData.message);
            Swal.fire('Успех!', resData.message, 'success');
            closeGroupEditor();
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Ошибка!', text: error.message });
        }
    }
});

copyScheduleBtn.addEventListener('click', async () => {
    const allGroups = Array.from(groupSelect.options).map(opt => opt.value).filter(val => val);
    const { value: sourceGroup } = await Swal.fire({
        title: 'Скопировать расписание',
        input: 'select',
        inputOptions: allGroups.reduce((acc, group) => {
            acc[group] = `Из группы ${group}`;
            return acc;
        }, {}),
        inputPlaceholder: 'Выберите группу-источник',
        showCancelButton: true,
        cancelButtonText: 'Отмена'
    });
    if (sourceGroup) {
        try {
            const params = new URLSearchParams({ searchGroup: sourceGroup, limit: 1 });
            const response = await fetch(`${API_URL}/api/learners?${params.toString()}`, { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await response.json();
            if (data.learners && data.learners.length > 0) {
                const schedule = data.learners[0].session_schedule;
                document.getElementById('group-sessionSchedule').value = schedule || '';
                Swal.fire('Скопировано!', 'Расписание вставлено в форму. Теперь вы можете сохранить изменения для целевой группы.', 'info');
            } else {
                throw new Error('В группе-источнике нет учащихся или расписания.');
            }
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Ошибка!', text: error.message });
        }
    }
});

document.addEventListener('DOMContentLoaded', () => {
    if (token) {
        resetInactivityTimer();
        showView('dashboard-container');
        showGroupsView();
        fetchAndRenderGroups();
        fetchDashboardStats();
    } else {
        showView('admin-login-container');
    }
});

window.addEventListener('mousemove', resetInactivityTimer);
window.addEventListener('mousedown', resetInactivityTimer);
window.addEventListener('keypress', resetInactivityTimer);
window.addEventListener('touchmove', resetInactivityTimer);