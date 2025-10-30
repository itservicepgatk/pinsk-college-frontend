const API_URL = 'https://pinsk-college-backend.onrender.com';

let loginFormContainer, studentInfoContainer, loginForm, errorMessage,
    studentInfoDiv, logoutButton, loader, slowConnectionMessage,
    materialsList, pdfModal, pdfTitle, pdfCloseBtn, pdfCanvas,
    prevPageBtn, nextPageBtn, pageNumSpan, pageCountSpan;

let pdfDoc = null;
let pageNum = 1;

function initializeElements() {
    loginFormContainer = document.getElementById('login-form-container');
    studentInfoContainer = document.getElementById('student-info-container');
    loginForm = document.getElementById('login-form');
    errorMessage = document.getElementById('error-message');
    studentInfoDiv = document.getElementById('student-info');
    logoutButton = document.getElementById('logout-button');
    loader = document.getElementById('loader');
    slowConnectionMessage = document.getElementById('slow-connection-message');
    materialsList = document.getElementById('materials-list');
    pdfModal = document.getElementById('pdf-modal');
    pdfTitle = document.getElementById('pdf-title');
    pdfCloseBtn = document.getElementById('pdf-close-btn');
    pdfCanvas = document.getElementById('pdf-canvas');
    prevPageBtn = document.getElementById('prev-page');
    nextPageBtn = document.getElementById('next-page');
    pageNumSpan = document.getElementById('page-num');
    pageCountSpan = document.getElementById('page-count');
}

function attachEventListeners() {
    loginForm.addEventListener('submit', handleLogin);
    logoutButton.addEventListener('click', handleLogout);
    prevPageBtn.addEventListener('click', onPrevPage);
    nextPageBtn.addEventListener('click', onNextPage);
    pdfCloseBtn.addEventListener('click', handlePdfClose);
}

async function handleLogin(event) {
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login, password })
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Произошла ошибка');
        }
        const data = await response.json();
        localStorage.setItem('studentToken', data.token);
        displayStudentInfo(data.studentData);
    } catch (error) {
        errorMessage.textContent = error.message;
    } finally {
        clearTimeout(slowConnectionTimer);
        loader.classList.add('hidden');
        slowConnectionMessage.classList.add('hidden');
        loginForm.querySelector('button').disabled = false;
    }
}

function handleLogout() {
    localStorage.removeItem('studentToken');
    studentInfoContainer.classList.add('hidden');
    loginFormContainer.classList.remove('hidden');
    loginForm.reset();
}

function handlePdfClose() {
    pdfModal.style.display = 'none';
}

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
            <span class="info-label">Шифр:</span>
            <span class="info-value">${data.studentCode || 'Нет данных'}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Специальность:</span>
            <span class="info-value">${data.specialty}</span>
        </div>
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
    materialsList.innerHTML = '';
    if (data.materials && data.materials.length > 0) {
        data.materials.forEach(material => {
            const link = document.createElement('a');
            link.textContent = material.name;
            link.href = '#';
            link.dataset.path = material.path;
            link.addEventListener('click', (e) => {
                e.preventDefault();
                openPdfViewer(material.path, material.name);
            });
            materialsList.appendChild(link);
        });
    } else {
        materialsList.innerHTML = '<p>Для вашей группы учебные материалы еще не загружены.</p>';
    }
}

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js`;

function renderPage(num) {
    pdfDoc.getPage(num).then(function (page) {
        const viewport = page.getViewport({ scale: 1.5 });
        pdfCanvas.height = viewport.height;
        pdfCanvas.width = viewport.width;
        const renderContext = {
            canvasContext: pdfCanvas.getContext('2d'),
            viewport: viewport
        };
        page.render(renderContext);
    });
    pageNumSpan.textContent = num;
}

function onPrevPage() {
    if (pageNum <= 1) return;
    pageNum--;
    renderPage(pageNum);
}

function onNextPage() {
    if (pageNum >= pdfDoc.numPages) return;
    pageNum++;
    renderPage(pageNum);
}

async function openPdfViewer(path, name) {
    pdfTitle.textContent = name;
    pdfModal.style.display = 'flex';
    const url = `${API_URL}/api/material?path=${encodeURIComponent(path)}`;
    const token = localStorage.getItem('studentToken');
    if (!token) {
        Swal.fire('Ошибка', 'Ваша сессия истекла. Пожалуйста, войдите заново.', 'error');
        return;
    }
    try {
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            throw new Error('Не удалось загрузить файл. Возможно, у вас нет доступа.');
        }
        const pdfData = await response.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument(pdfData);
        const pdf = await loadingTask.promise;
        pdfDoc = pdf;
        pageCountSpan.textContent = pdfDoc.numPages;
        pageNum = 1;
        renderPage(pageNum);
    } catch (error) {
        console.error('Ошибка загрузки PDF:', error);
        Swal.fire('Ошибка', error.message, 'error');
        pdfModal.style.display = 'none';
    }
}

document.addEventListener('contextmenu', (event) => {
    if (studentInfoContainer && studentInfoContainer.classList.contains('hidden')) {
        return;
    }
    event.preventDefault();
});

window.addEventListener('keydown', function(event) {
    if (studentInfoContainer && studentInfoContainer.classList.contains('hidden')) {
        return;
    }
    if (event.ctrlKey || event.metaKey) {
        const key = event.key.toLowerCase();
        if (key === 'c' || key === 'p') {
            event.preventDefault();
        }
        if (key === 's') {
            event.preventDefault();
            Swal.fire({
                icon: 'warning',
                title: 'Действие заблокировано',
                text: 'Сохранение страницы отключено в целях безопасности.',
                timer: 2000,
                showConfirmButton: false,
            });
        }
    }
});

initializeElements();
attachEventListeners();