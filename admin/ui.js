import { DOMElements } from './dom.js';

export function showView(viewId) {
    DOMElements.adminLoginContainer.classList.add('hidden');
    DOMElements.dashboardContainer.classList.add('hidden');
    document.getElementById(viewId).classList.remove('hidden');
    document.body.classList.toggle('login-view', viewId === 'admin-login-view-container');
}

export function showGroupsView() {
    DOMElements.dashboardTitle.textContent = 'Группы';
    DOMElements.learnersView.classList.add('hidden');
    DOMElements.groupsView.classList.remove('hidden');
}

export function showLearnersView(groupName) {
    DOMElements.dashboardTitle.textContent = groupName === 'Все' ? 'Все учащиеся' : `Учащиеся группы №${groupName}`;
    DOMElements.groupsView.classList.add('hidden');
    DOMElements.learnersView.classList.remove('hidden');
}

export function renderPagination(totalPages, currentPage, container, onPageClick) {
    container.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
        const button = document.createElement('button');
        button.textContent = i;
        if (i === currentPage) {
            button.classList.add('active');
        }
        button.addEventListener('click', () => onPageClick(i));
        container.appendChild(button);
    }
}

export function updateSortIndicators(currentSort) {
    document.querySelectorAll('#table-head th[data-sort-by]').forEach(th => {
        th.classList.remove('asc', 'desc');
        if (th.dataset.sortBy === currentSort.key) {
            th.classList.add(currentSort.direction);
        }
    });
}

export function showAlert(type, title, text) {
    Swal.fire({ icon: type, title, text });
}

export async function showConfirm(title, text, confirmButtonText = 'Да, удалить!') {
    const result = await Swal.fire({
        title,
        text,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText,
        cancelButtonText: 'Отмена'
    });
    return result.isConfirmed;
}

export function toggleSuperAdminFeatures(userRole) {
    const superAdminElements = document.querySelectorAll('.super-admin-feature');
    const isSuperAdmin = userRole === 'superadmin';
    superAdminElements.forEach(el => el.classList.toggle('hidden', !isSuperAdmin));
}

export function showLoading() {
    Swal.fire({
        title: 'Подождите...',
        didOpen: () => {
            Swal.showLoading();
        },
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false
    });
}

export function closeLoading() {
    Swal.close();
}