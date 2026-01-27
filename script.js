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

// === ФУНКЦИЯ ДЛЯ ПРЕВРАЩЕНИЯ LATIN -> КИРИЛЛИЦА ===
function detransliterate(text) {
    if (!text) return text;

    const lastDotIndex = text.lastIndexOf('.');
    let name = text;
    let ext = '';
    if (lastDotIndex !== -1) {
        name = text.substring(0, lastDotIndex);
        ext = text.substring(lastDotIndex);
    }

    name = name.replace(/_/g, ' ');

    const map = {
        'SCH': 'Щ', 'Sch': 'Щ', 'sch': 'щ',
        'ZH': 'Ж', 'Zh': 'Ж', 'zh': 'ж',
        'CH': 'Ч', 'Ch': 'Ч', 'ch': 'ч',
        'SH': 'Ш', 'Sh': 'Ш', 'sh': 'ш',
        'YU': 'Ю', 'Yu': 'Ю', 'yu': 'ю',
        'YA': 'Я', 'Ya': 'Я', 'ya': 'я',
        'A': 'А', 'a': 'а',
        'B': 'Б', 'b': 'б',
        'V': 'В', 'v': 'в',
        'G': 'Г', 'g': 'г',
        'D': 'Д', 'd': 'д',
        'E': 'Е', 'e': 'е',
        'Z': 'З', 'z': 'з',
        'I': 'И', 'i': 'и',
        'J': 'Й', 'j': 'й',
        'K': 'К', 'k': 'к',
        'L': 'Л', 'l': 'л',
        'M': 'М', 'm': 'м',
        'N': 'Н', 'n': 'н',
        'O': 'О', 'o': 'о',
        'P': 'П', 'p': 'п',
        'R': 'Р', 'r': 'р',
        'S': 'С', 's': 'с',
        'T': 'Т', 't': 'т',
        'U': 'У', 'u': 'у',
        'F': 'Ф', 'f': 'ф',
        'H': 'Х', 'h': 'х',
        'C': 'Ц', 'c': 'ц',
        'Y': 'Ы', 'y': 'ы'
    };

    for (const [eng, rus] of Object.entries(map)) {
        name = name.split(eng).join(rus);
    }

    return name + ext;
}

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

function loadSavedLogins() {
    const savedLearner = localStorage.getItem('savedLearnerLogin');
    const savedAdmin = localStorage.getItem('savedAdminLogin');

    if (savedLearner) {
        learnerForm.elements.login.value = savedLearner;
        document.getElementById('remember-learner').checked = true;
    }

    if (savedAdmin) {
        adminForm.elements['admin-login'].value = savedAdmin;
        document.getElementById('remember-admin').checked = true;
    }
}

async function handleLearnerLogin(event) {
    event.preventDefault();
    const login = learnerForm.elements.login.value;
    const password = learnerForm.elements.password.value;
    const rememberMe = document.getElementById('remember-learner').checked;

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
        
        if (rememberMe) {
            localStorage.setItem('savedLearnerLogin', login);
        } else {
            localStorage.removeItem('savedLearnerLogin');
        }

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
    const rememberMe = document.getElementById('remember-admin').checked;

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

        if (rememberMe) {
            localStorage.setItem('savedAdminLogin', login);
        } else {
            localStorage.removeItem('savedAdminLogin');
        }

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

function getIconForFile(fileName) {
    const extension = fileName.split('.').pop().toLowerCase();
    switch (extension) {
        case 'pdf': return '📄';
        case 'doc': case 'docx': return '📝';
        case 'txt': case 'md': return '🗒️';
        case 'xls': case 'xlsx': case 'csv': return '📈';
        case 'ppt': case 'pptx': return '📊';
        case 'png': case 'jpg': case 'jpeg': case 'gif': case 'webp': case 'svg': return '🖼️';
        case 'zip': case 'rar': case '7z': return '📦';
        case 'mp3': case 'wav': return '🎵';
        case 'mp4': case 'mov': case 'avi': return '🎥';
        default: return '📄';
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
            const displayName = detransliterate(material.name);
            
            link.innerHTML = `${getIconForFile(material.name)} ${displayName}`;
            link.href = '#';
            link.dataset.path = material.path;
            link.addEventListener('click', (e) => {
                e.preventDefault();
                openFileViewer(material.path, displayName);
            });
            materialsList.appendChild(link);
        });
    } else {
        materialsList.innerHTML = '<p>Для вашей группы учебные материалы еще не загружены.</p>';
    }

    const announcementsContainer = document.getElementById('announcements-list');
    announcementsContainer.innerHTML = '';
    if (data.announcements && data.announcements.length > 0) {
        data.announcements.forEach(ann => {
            const item = document.createElement('div');
            item.className = `announcement-item type-${ann.type}`;

            const attachmentLink = ann.file_url 
                ? `<div class="announcement-attachment">
                       <a href="${ann.file_url}" target="_blank" rel="noopener noreferrer">
                           📎 Скачать прикрепленный файл
                       </a>
                   </div>`
                : '';

            item.innerHTML = `
                <div class="announcement-header">
                    <span class="announcement-title">${ann.title}</span>
                    <span class="announcement-date">${new Date(ann.created_at).toLocaleDateString('ru-RU')}</span>
                </div>
                <div class="announcement-content">${ann.content}</div>
                ${attachmentLink}
            `;
            announcementsContainer.appendChild(item);
        });
    } else {
        announcementsContainer.innerHTML = '<p>Актуальных объявлений нет.</p>';
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

// === УНИВЕРСАЛЬНАЯ ФУНКЦИЯ ПРОСМОТРА (БЕЗ СКАЧИВАНИЯ) ===
async function openFileViewer(path, name) {
    const token = localStorage.getItem('learnerToken');
    if (!token) {
        Swal.fire('Ошибка', 'Ваша сессия истекла. Пожалуйста, войдите заново.', 'error');
        return;
    }

    const extension = path.split('.').pop().toLowerCase();

    // 1. ОФИСНЫЕ ДОКУМЕНТЫ (Word, Excel, PowerPoint)
    if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension)) {
        try {
            Swal.fire({ title: 'Загрузка документа...', didOpen: () => Swal.showLoading() });

            const response = await fetch(`${API_URL}/api/learners/get-material-url?path=${encodeURIComponent(path)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Не удалось получить ссылку');
            const { signedUrl } = await response.json();

            Swal.close();

            const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(signedUrl)}&embedded=true`;

            // Добавляем оверлей, чтобы перекрыть кнопку "Открыть в новой вкладке"
            const htmlContent = `
                <div style="position: relative; width: 100%; height: 80vh;">
                    <iframe src="${googleViewerUrl}" style="width:100%; height:100%; border:none;"></iframe>
                    <div style="position: absolute; top: 0; right: 0; width: 60px; height: 60px; background: transparent; z-index: 10;"></div>
                </div>
            `;

            Swal.fire({
                title: name,
                html: htmlContent,
                width: '90vw',
                showCloseButton: true,
                showConfirmButton: false,
            });
        } catch (e) {
            Swal.fire('Ошибка', 'Не удалось открыть документ', 'error');
        }
        return;
    }

    // 2. PDF и КАРТИНКИ
    try {
        Swal.fire({ title: 'Загрузка файла...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });

        const response = await fetch(`${API_URL}/api/learners/material?path=${encodeURIComponent(path)}`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Не удалось получить доступ к файлу.' }));
            throw new Error(errorData.message);
        }

        Swal.close();

        if (extension === 'pdf') {
            const pdfData = await response.arrayBuffer();
            pdfTitle.textContent = name;
            pdfModal.classList.remove('hidden');

            const loadingTask = pdfjsLib.getDocument(pdfData);
            const pdf = await loadingTask.promise;
            pdfDoc = pdf;
            pageCountSpan.textContent = pdfDoc.numPages;
            pageNum = 1;
            renderPage(pageNum);
        } else if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(extension)) {
            const imageBlob = await response.blob();
            const imageUrl = URL.createObjectURL(imageBlob);
            Swal.fire({
                title: name,
                imageUrl: imageUrl,
                imageAlt: name,
                width: '80vw',
                showConfirmButton: false, 
                showCloseButton: true,
                willClose: () => {
                    URL.revokeObjectURL(imageUrl);
                }
            });
        } else {
            Swal.fire({
                icon: 'info',
                title: 'Просмотр недоступен',
                text: 'Этот тип файла нельзя просмотреть в браузере, а скачивание отключено.'
            });
        }
    } catch (error) {
        Swal.close();
        console.error('Ошибка загрузки файла:', error);
        Swal.fire({
            icon: 'error',
            title: 'Ошибка',
            text: error.message || 'Не удалось загрузить материал.'
        });
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
    loadSavedLogins();

    // === ЛОГИКА QR ВХОДА ===
    const urlParams = new URLSearchParams(window.location.search);
    const qrKey = urlParams.get('qr_login');

    if (qrKey) {
        window.history.replaceState({}, document.title, window.location.pathname);
        
        try {
            learnerLoader.classList.remove('hidden');
            loginViewContainer.classList.add('hidden');
            
            const response = await fetch(`${API_URL}/qr-login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: qrKey })
            });

            if (!response.ok) throw new Error('Неверный QR-код');

            const data = await response.json();
            localStorage.setItem('learnerToken', data.token);
            handleMaintenanceBanner(data.maintenanceMode);
            displayLearnerInfo(data.learnerData);
            
            return; 

        } catch (error) {
            console.error(error);
            loginViewContainer.classList.remove('hidden');
            learnerLoader.classList.add('hidden');
            Swal.fire({
                icon: 'error',
                title: 'Ошибка входа',
                text: 'QR-код устарел или недействителен. Пожалуйста, войдите с помощью логина и пароля.'
            });
        }
    }
    // =======================

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