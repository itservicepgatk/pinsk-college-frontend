const API_URL = 'https://pinsk-college-backend.onrender.com';

const loginFormContainer = document.getElementById('login-form-container');
const studentInfoContainer = document.getElementById('student-info-container');
const loginForm = document.getElementById('login-form');
const errorMessage = document.getElementById('error-message');
const studentInfoDiv = document.getElementById('student-info');
const logoutButton = document.getElementById('logout-button');
const loader = document.getElementById('loader');
const slowConnectionMessage = document.getElementById('slow-connection-message');

loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const login = document.getElementById('login').value;
    const password = document.getElementById('password').value;

    errorMessage.textContent = '';
    slowConnectionMessage.classList.add('hidden');
    loader.classList.remove('hidden');
    loginForm.querySelector('button').disabled = true;

    const slowConnectionTimer = setTimeout(() => {
        slowConnectionMessage.textContent = 'Плохое соединение с интернетом, подождите пожалуйста...';
        slowConnectionMessage.classList.remove('hidden');
    }, 3000);

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ login, password })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Произошла ошибка');
        }

        const studentData = await response.json();
        displayStudentInfo(studentData);

    } catch (error) {
        errorMessage.textContent = error.message;
    } finally {
        clearTimeout(slowConnectionTimer);
        loader.classList.add('hidden');
        slowConnectionMessage.classList.add('hidden');
        loginForm.querySelector('button').disabled = false;
    }
});

function displayStudentInfo(data) {
    loginFormContainer.classList.add('hidden');
    studentInfoContainer.classList.remove('hidden');
    studentInfoDiv.innerHTML = `
        <div class="info-row">
            <span class="info-label">ФИО:</span>
            <span class="info-value">${data.fullName}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Курс:</span>
            <span class="info-value">${data.course}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Группа:</span>
            <span class="info-value">${data.group}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Специальность:</span>
            <span class="info-value">${data.specialty}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Дата зачисления:</span>
            <span class="info-value">${data.enrollmentDate}</span>
        </div>
        <hr>
        <div class="info-row">
            <span class="info-label">Расписание сессий:</span>
            <span class="info-value">${data.sessionSchedule || 'Нет данных'}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Академические задолженности:</span>
            <span class="info-value ${!data.academicDebts || data.academicDebts.toLowerCase() === 'нет' ? 'no-debts' : 'has-debts'}">
                ${data.academicDebts || 'Отсутствуют'}
            </span>
        </div>
    `;
}

logoutButton.addEventListener('click', () => {
    studentInfoContainer.classList.add('hidden');
    loginFormContainer.classList.remove('hidden');
    loginForm.reset();
});