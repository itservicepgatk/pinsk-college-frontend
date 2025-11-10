import { DOMElements } from '../dom.js';
import * as api from '../api.js';
import * as ui from '../ui.js';

// Вспомогательная функция для скачивания файла
function downloadFile(content, fileName, contentType) {
    const a = document.createElement("a");
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
}

async function handleGenerateDebtorsCsv() {
    try {
        Swal.fire({ title: 'Генерация отчета...', text: 'Пожалуйста, подождите.', didOpen: () => Swal.showLoading() });
        
        const { csvData, fileName } = await api.getDebtorsReportCsv();
        
        Swal.close();
        downloadFile(csvData, fileName, 'text/csv;charset=utf-8;');
        ui.showAlert('success', 'Успех!', 'Отчет по должникам успешно сгенерирован и скачан.');
    } catch (error) {
        Swal.close();
        ui.showAlert('error', 'Ошибка!', error.message);
    }
}

export function initializeReports() {
    // Динамически добавляем элементы в DOM, так как они были добавлены в HTML
    DOMElements.reportsBtn = document.getElementById('reports-btn');
    DOMElements.reportsModal = document.getElementById('reports-modal');
    DOMElements.reportsCloseBtn = document.getElementById('reports-close-btn');
    DOMElements.generateDebtorsCsvBtn = document.getElementById('generate-debtors-csv-btn');

    DOMElements.reportsBtn.addEventListener('click', () => {
        DOMElements.reportsModal.classList.remove('hidden');
    });

    DOMElements.reportsCloseBtn.addEventListener('click', () => {
        DOMElements.reportsModal.classList.add('hidden');
    });

    DOMElements.generateDebtorsCsvBtn.addEventListener('click', handleGenerateDebtorsCsv);
}