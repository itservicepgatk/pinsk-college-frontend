
export const showSuccess = (title, text = '') => Swal.fire({ icon: 'success', title, text, showConfirmButton: false, timer: 1500 });
export const showError = (title, text = '') => Swal.fire({ icon: 'error', title, text });
export const showInfo = (title, text = '') => Swal.fire({ icon: 'info', title, text });
export const showWarning = (title, text = '') => Swal.fire({ icon: 'warning', title, text });

export const showConfirm = (title, text, confirmButtonText = 'Да, удалить!') => {
    return Swal.fire({
        title,
        text,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText,
        cancelButtonText: 'Отмена'
    });
};

export const showLoading = (title = 'Загрузка...', text = 'Пожалуйста, подождите.') => {
    Swal.fire({
        title,
        text,
        didOpen: () => { Swal.showLoading() },
        allowOutsideClick: false
    });
};

export const closeLoading = () => Swal.close();