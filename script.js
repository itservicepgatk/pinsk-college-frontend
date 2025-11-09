const API_URL = 'https://pinsk-college-backend.onrender.com';
const appWrapper = document.getElementById('app-wrapper');
const loginViewContainer = document.getElementById('login-view-container');
const learnerInfoContainer = document.getElementById('learner-info-container');
const maintenanceBanner = document.getElementById('maintenance-banner');
const tabsContainer = document.querySelector('.tabs');
const learnerForm = document.getElementById('login-form');
const adminForm = document.getElementById('admin-login-form');
const learnerLoader = document.getElementById('loader');
const learnerErrorMessage = document.getElementById('error-message');
const slowConnectionMessage = document.getElementById('slow-connection-message');
const adminLoader = document.getElementById('admin-loader');
const adminErrorMessage = document.getElementById('admin-error-message');
const personalDataContent = document.getElementById('personal-data-content');
const materialsList = document.getElementById('materials-list');
const logoutButton = document.getElementById('logout-button');
const pdfModal = document.getElementById('pdf-modal');
const pdfTitle = document.getElementById('pdf-title');
const pdfCloseBtn = document.getElementById('pdf-close-btn');
const pdfCanvas = document.getElementById('pdf-canvas');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const pageNumSpan = document.getElementById('page-num');
const pageCountSpan = document.getElementById('page-count');
let heartbeatInterval = null;
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js`;
let pdfDoc = null;
let pageNum = 1;
tabsContainer.addEventListener('click', (e) => {
    e.preventDefault();
    const targetTab = e.target.closest('.tab');
    if (!targetTab) return;
    tabsContainer.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.login-form').forEach(form => form.classList.remove('active'));
    targetTab.classList.add('active');
    const formToShow = document.getElementById(targetTab.dataset.form === 'learner' ? 'login-form' : 'admin-login-form');
    if (formToShow) {
        formToShow.classList.add('active');
    }
});
async function handleLearnerLogin(event) {
    event.preventDefault();
    const login = learnerForm.elements.login.value;
    const password = learnerForm.elements.password.value;
    learnerErrorMessage.textContent = '';
    slowConnectionMessage.classList.add('hidden');
    learnerLoader.classList.remove('hidden');
    learnerForm.querySelector('button').disabled = true;
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
            body: JSON.stringify({
                login,
                password
            })
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Произошла ошибка');
        }
        const data = await response.json();
        localStorage.setItem('learnerToken', data.token);
        handleMaintenanceBanner(data.maintenanceMode);
        displayLearnerInfo(data.learnerData);
    } catch (error) {
        learnerErrorMessage.textContent = error.message;
    } finally {
        clearTimeout(slowConnectionTimer);
        learnerLoader.classList.add('hidden');
        slowConnectionMessage.classList.add('hidden');
        learnerForm.querySelector('button').disabled = false;
    }
}
adminForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const login = adminForm.elements['admin-login'].value;
    const password = adminForm.elements['admin-password'].value;
    adminErrorMessage.textContent = '';
    adminLoader.classList.remove('hidden');
    adminForm.querySelector('button').disabled = true;
    try {
        const response = await fetch(`${API_URL}/admin/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                login,
                password
            })
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Произошла ошибка');
        }
        const data = await response.json();
        localStorage.setItem('adminToken', data.token);
        localStorage.setItem('adminRole', data.role);
        window.location.href = 'admin.html';
    } catch (error) {
        adminErrorMessage.textContent = error.message;
    } finally {
        adminLoader.classList.add('hidden');
        adminForm.querySelector('button').disabled = false;
    }
});
function handleMaintenanceBanner(enabled) {
    if (enabled) {
        maintenanceBanner.classList.add('visible');
        document.body.classList.add('maintenance-active');
    } else {
        maintenanceBanner.classList.remove('visible');
        document.body.classList.remove('maintenance-active');
    }
}
function displayLearnerInfo(data) {
    loginViewContainer.classList.add('hidden');
    learnerInfoContainer.classList.remove('hidden');
    appWrapper.style.justifyContent = 'flex-start';
    personalDataContent.innerHTML = `
        <div class="info-row"><span class="info-label">ФИО:</span><span class="info-value">${data.fullName}</span></div>
        <div class="info-row"><span class="info-label">Курс:</span><span class="info-value">${data.course}</span></div>
        <div class="info-row"><span class="info-label">Группа:</span><span class="info-value">${data.group}</span></div>
        <div class="info-row"><span class="info-label">Шифр:</span><span class="info-value">${data.studentCode || 'Нет данных'}</span></div>
        <div class="info-row"><span class="info-label">Специальность:</span><span class="info-value">${data.specialty}</span></div>
        <div class="info-row"><span class="info-label">Расписание сессий:</span><span class="info-value">${data.sessionSchedule || 'Нет данных'}</span></div>
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
    clearInterval(heartbeatInterval);
    heartbeatInterval = setInterval(async () => {
        const token = localStorage.getItem('learnerToken');
        if (token) {
            try {
                await fetch(`${API_URL}/api/learners/heartbeat`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
            } catch (e) {
                console.error('Heartbeat failed:', e);
            }
        } else {
            clearInterval(heartbeatInterval);
        }
    }, 30000);
}
async function handleLogout() {
    clearInterval(heartbeatInterval);
    const token = localStorage.getItem('learnerToken');
    if (token) {
        try {
            await fetch(`${API_URL}/api/learners/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        } catch (error) {
            console.error('Не удалось записать лог о выходе:', error);
        }
    }
    localStorage.removeItem('learnerToken');
    learnerInfoContainer.classList.add('hidden');
    loginViewContainer.classList.remove('hidden');
    appWrapper.style.justifyContent = 'center';
    learnerForm.reset();
}
function renderPage(num) {
    pdfDoc.getPage(num).then(function(page) {
        const viewport = page.getViewport({
            scale: 1.5
        });
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
prevPageBtn.addEventListener('click', onPrevPage);
nextPageBtn.addEventListener('click', onNextPage);
pdfCloseBtn.addEventListener('click', () => {
    pdfModal.classList.add('hidden');
});
async function openPdfViewer(path, name) {
    pdfTitle.textContent = 'Загрузка...';
    pdfModal.classList.remove('hidden');
    const token = localStorage.getItem('learnerToken');
    if (!token) {
        Swal.fire('Ошибка', 'Ваша сессия истекла. Пожалуйста, войдите заново.', 'error');
        pdfModal.classList.add('hidden');
        return;
    }
    try {
        const response = await fetch(`${API_URL}/api/learners/material?path=${encodeURIComponent(path)}`, {
            headers: {
                Authorization: `Bearer ${token}`
            },
        });
        if (!response.ok) throw new Error('Не удалось получить доступ к файлу.');
        const pdfData = await response.arrayBuffer();
        pdfTitle.textContent = name;
        const loadingTask = pdfjsLib.getDocument(pdfData);
        const pdf = await loadingTask.promise;
        pdfCloseBtn.onclick = () => {
            pdfModal.classList.add('hidden');
        };
        pdfDoc = pdf;
        pageCountSpan.textContent = pdfDoc.numPages;
        pageNum = 1;
        renderPage(pageNum);
    } catch (error) {
        console.error('Ошибка загрузки PDF:', error);
        Swal.fire({
            icon: 'error',
            title: 'Ошибка',
            text: error.message || 'Не удалось загрузить материал.'
        });
        pdfModal.classList.add('hidden');
    }
}
document.addEventListener('contextmenu', (event) => {
    if (!learnerInfoContainer.classList.contains('hidden')) {
        event.preventDefault();
    }
});
window.addEventListener('keydown', function(event) {
    if (learnerInfoContainer.classList.contains('hidden')) return;
    if (event.ctrlKey || event.metaKey) {
        const key = event.key.toLowerCase();
        if (key === 'c' || key === 'p' || key === 's') event.preventDefault();
    }
});
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch(`${API_URL}/api/settings/maintenance`);
        if (res.ok) {
            const data = await res.json();
            handleMaintenanceBanner(data.enabled);
        }
    } catch (e) {
        console.error("Не удалось проверить статус режима тестирования");
    }
});
window.addEventListener('beforeunload', () => {
    const token = localStorage.getItem('learnerToken');
    if (token) {
        navigator.sendBeacon(`${API_URL}/api/learners/logout`, new Blob([], {
            type: 'application/json'
        }));
    }
});
learnerForm.addEventListener('submit', handleLearnerLogin);
logoutButton.addEventListener('click', handleLogout);
document.querySelectorAll('.password-toggle-icon').forEach(icon => {
    icon.addEventListener('click', () => {
        const passwordInput = icon.previousElementSibling;
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            icon.classList.add('is-visible');
        } else {
            passwordInput.type = 'password';
            icon.classList.remove('is-visible');
        }
    });
});