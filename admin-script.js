const API_URL = 'https://pinsk-college-backend.onrender.com';
let students = [];
let token = localStorage.getItem('adminToken');
let currentPage = 1;
let currentSort = { key: 'full_name', direction: 'asc' };
let currentSearch = '';
let searchTimer;

const adminLoginContainer = document.getElementById('admin-login-container');
const dashboardContainer = document.getElementById('dashboard-container');
const adminLoginForm = document.getElementById('admin-login-form');
const adminLoader = document.getElementById('admin-loader');
const adminErrorMessage = document.getElementById('admin-error-message');
const logoutButton = document.getElementById('logout-button');
const studentsTableBody = document.getElementById('students-table-body');
const addStudentBtn = document.getElementById('add-student-btn');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const studentForm = document.getElementById('student-form');
const cancelBtn = document.getElementById('cancel-btn');
const searchInput = document.getElementById('search-input');
const tableHead = document.getElementById('table-head');

function renderStudents(studentsToRender) {
    const studentsArray = studentsToRender || [];
    studentsTableBody.innerHTML = '';
    studentsArray.forEach(student => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${student.full_name}</td>
            <td>${student.group_name}</td>
            <td>${student.login}</td>
            <td class="action-buttons">
                <button class="btn-secondary" onclick="editStudent(${student.id})">Ред.</button>
                <button class="btn-danger" onclick="deleteStudent(${student.id})">Удал.</button>
            </td>
        `;
        studentsTableBody.appendChild(row);
    });
}

async function fetchStudents() {
    try {
        const params = new URLSearchParams({
            page: currentPage,
            limit: 10,
            sortBy: currentSort.key,
            sortDir: currentSort.direction,
            search: currentSearch
        });
        const response = await fetch(`${API_URL}/api/students?${params.toString()}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Не удалось загрузить студентов');
        const data = await response.json();
        students = data.students || [];
        renderStudents(students);
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
            fetchStudents();
        });
        paginationContainer.appendChild(button);
    }
}

function showView(view) {
    adminLoginContainer.classList.add('hidden');
    dashboardContainer.classList.add('hidden');
    document.getElementById(view).classList.remove('hidden');
}

function validateForm() {
    const fields = studentForm.querySelectorAll('input, textarea');
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
    const isEditing = !!document.getElementById('student-id').value;
    if (!isEditing && !password) {
        isValid = false;
        document.getElementById('password').classList.add('invalid');
        errorMessage = 'При создании нового студента пароль обязателен.';
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

function openModal(mode, studentId = null) {
    studentForm.reset();
    document.getElementById('student-id').value = '';
    if (mode === 'add') {
        modalTitle.textContent = 'Добавить студента';
        document.querySelector('label[for="password"]').textContent = 'Пароль:';
    } else if (mode === 'edit') {
        modalTitle.textContent = 'Редактировать студента';
        document.querySelector('label[for="password"]').textContent = 'Новый пароль (оставьте пустым, чтобы не менять):';
        const student = students.find(s => Number(s.id) === Number(studentId));
        if (student) {
            document.getElementById('student-id').value = student.id;
            document.getElementById('fullName').value = student.full_name;
            document.getElementById('login').value = student.login;
            document.getElementById('group_name').value = student.group_name;
            document.getElementById('course').value = student.course;
            document.getElementById('specialty').value = student.specialty || '';
            document.getElementById('enrollmentDate').value = student.enrollment_date || '';
            document.getElementById('sessionSchedule').value = student.session_schedule || '';
            document.getElementById('academicDebts').value = student.academic_debts || '';
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Ошибка!',
                text: 'Не удалось найти данные студента для редактирования.',
            });
            return;
        }
    }
    modal.classList.remove('hidden');
}

function closeModal() {
    modal.classList.add('hidden');
}

window.editStudent = (id) => {
    openModal('edit', id);
};

window.deleteStudent = async (id) => {
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
            const response = await fetch(`${API_URL}/api/students/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Ошибка при удалении');
            Swal.fire('Удалено!', 'Данные студента были успешно удалены.', 'success');
            if (students.length === 1 && currentPage > 1) {
                currentPage = currentPage - 1;
            }
            fetchStudents();
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
            const err = await response.json();
            throw new Error(err.message);
        }
        const data = await response.json();
        token = data.token;
        localStorage.setItem('adminToken', token);
        showView('dashboard-container');
        currentPage = 1;
        fetchStudents();
    } catch (error) {
        adminErrorMessage.textContent = error.message;
    } finally {
        adminLoader.classList.add('hidden');
    }
});

logoutButton.addEventListener('click', () => {
    token = null;
    localStorage.removeItem('adminToken');
    showView('admin-login-container');
});

addStudentBtn.addEventListener('click', () => {
    openModal('add');
});

cancelBtn.addEventListener('click', closeModal);

studentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateForm()) {
        return;
    }
    const id = document.getElementById('student-id').value;
    const studentData = {
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
    if (!studentData.password) {
        delete studentData.password;
    }
    const isEditing = !!id;
    const url = isEditing ? `${API_URL}/api/students/${id}` : `${API_URL}/api/students`;
    const method = isEditing ? 'PUT' : 'POST';
    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(studentData)
        });
        if (!response.ok) throw new Error('Ошибка при сохранении данных');
        closeModal();
        fetchStudents();
        Swal.fire({
            icon: 'success',
            title: 'Сохранено!',
            text: 'Данные студента успешно обновлены.',
            showConfirmButton: false,
            timer: 1500
        });
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Ошибка!', text: error.message });
    }
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
    fetchStudents();
});

searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        currentSearch = searchInput.value;
        currentPage = 1;
        fetchStudents();
    }, 300);
});

document.addEventListener('DOMContentLoaded', () => {
    if (token) {
        showView('dashboard-container');
        currentPage = 1;
        fetchStudents();
    } else {
        showView('admin-login-container');
    }
});