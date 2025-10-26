const API_URL = 'https://pinsk-college-backend.onrender.com';
let students = [];
let token = localStorage.getItem('adminToken');

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

function renderStudents() {
    studentsTableBody.innerHTML = '';
    students.forEach(student => {
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
        const response = await fetch(`${API_URL}/api/students`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Не удалось загрузить студентов');
        students = await response.json();
        renderStudents();
    } catch (error) {
        alert(error.message);
    }
}

function showView(view) {
    adminLoginContainer.classList.add('hidden');
    dashboardContainer.classList.add('hidden');
    document.getElementById(view).classList.remove('hidden');
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

        const student = students.find(s => s.id === studentId);
        
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
            alert('Ошибка: не удалось найти данные студента для редактирования.');
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
    if (!confirm('Вы уверены, что хотите удалить этого студента?')) return;

    try {
        const response = await fetch(`${API_URL}/api/students/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Ошибка при удалении');
        fetchStudents();
    } catch (error) {
        alert(error.message);
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
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(studentData)
        });
        if (!response.ok) throw new Error('Ошибка при сохранении данных');
        closeModal();
        fetchStudents();
    } catch (error) {
        alert(error.message);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    if (token) {
        showView('dashboard-container');
        fetchStudents();
    } else {
        showView('admin-login-container');
    }
});