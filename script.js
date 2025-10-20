const API_URL = 'http://localhost:3000';

const loginFormContainer = document.getElementById('login-form-container');
const studentInfoContainer = document.getElementById('student-info-container');
const loginForm = document.getElementById('login-form');
const errorMessage = document.getElementById('error-message');
const studentInfoDiv = document.getElementById('student-info');
const logoutButton = document.getElementById('logout-button');

loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const login = document.getElementById('login').value;
    const password = document.getElementById('password').value;
    errorMessage.textContent = '';
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
    }
});

function displayStudentInfo(data) {
    loginFormContainer.classList.add('hidden');
    studentInfoContainer.classList.remove('hidden');
    studentInfoDiv.innerHTML = `
        <p><strong>ФИО:</strong> ${data.fullName}</p>
        <p><strong>Курс:</strong> ${data.course}</p>
        <p><strong>Группа:</strong> ${data.group}</p>
        <p><strong>Специальность:</strong> ${data.specialty}</p>
        <p><strong>Дата зачисления:</strong> ${data.enrollmentDate}</p>
    `;
}

logoutButton.addEventListener('click', () => {
    studentInfoContainer.classList.add('hidden');
    loginFormContainer.classList.remove('hidden');
    loginForm.reset();
});