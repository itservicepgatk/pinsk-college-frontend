const API_URL = 'https://pinsk-college-backend.onrender.com';

const appWrapper = document.getElementById('app-wrapper');
const loginFormContainer = document.getElementById('login-view-container');
const learnerInfoContainer = document.getElementById('learner-info-container');
const loginForm = document.getElementById('login-form');
const errorMessage = document.getElementById('error-message');
const personalDataContent = document.getElementById('personal-data-content');
const materialsList = document.getElementById('materials-list');
const logoutButton = document.getElementById('logout-button');
const loader = document.getElementById('loader');
const slowConnectionMessage = document.getElementById('slow-connection-message');
const pdfModal = document.getElementById('pdf-modal');
const pdfTitle = document.getElementById('pdf-title');
const pdfCloseBtn = document.getElementById('pdf-close-btn');
const pdfCanvas = document.getElementById('pdf-canvas');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const pageNumSpan = document.getElementById('page-num');
const pageCountSpan = document.getElementById('page-count');

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js`;
let pdfDoc = null;
let pageNum = 1;

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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login, password })
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Произошла ошибка');
        }
        const data = await response.json();
        localStorage.setItem('learnerToken', data.token);
        displayLearnerInfo(data.learnerData);
    } catch (error) {
        errorMessage.textContent = error.message;
    } finally {
        clearTimeout(slowConnectionTimer);
        loader.classList.add('hidden');
        slowConnectionMessage.classList.add('hidden');
        loginForm.querySelector('button').disabled = false;
    }
});

function displayLearnerInfo(data) {
    loginFormContainer.classList.add('hidden');
    learnerInfoContainer.classList.remove('hidden');
    appWrapper.style.justifyContent = 'flex-start'; 

    personalDataContent.innerHTML = `
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

logoutButton.addEventListener('click', () => {
    localStorage.removeItem('learnerToken');
    learnerInfoContainer.classList.add('hidden');
    loginFormContainer.classList.remove('hidden');
    appWrapper.style.justifyContent = 'center'; 
    loginForm.reset();
});

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
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error('Не удалось получить доступ к файлу.');
    }

    const pdfBlob = await response.blob();

    const pdfUrl = URL.createObjectURL(pdfBlob);

    pdfTitle.textContent = name;
    const loadingTask = pdfjsLib.getDocument(pdfUrl);
    const pdf = await loadingTask.promise;

    pdfCloseBtn.onclick = () => {
        pdfModal.classList.add('hidden');
        URL.revokeObjectURL(pdfUrl); 
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
      text: error.message || 'Не удалось загрузить методический материал.',
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
    if (learnerInfoContainer.classList.contains('hidden')) {
        return;
    }
    if (event.ctrlKey || event.metaKey) {
        const key = event.key.toLowerCase();
        if (key === 'c' || key === 'p') {
            event.preventDefault();
        }
        if (key === 's') {
            event.preventDefault();
            const blocker = document.getElementById('save-blocker');
            if (blocker) {
                blocker.style.display = 'flex';
                setTimeout(() => {
                    blocker.style.display = 'none';
                }, 500);
            }
        }
    }
});