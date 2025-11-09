import { DOMElements } from '../dom.js';
import * as api from '../api.js';
import * as ui from '../ui.js';
import { initializeDashboard } from './dashboard.js';
import { initializeGroups } from './groups.js';
async function openGroupEditor() {
    DOMElements.groupEditorForm.reset();
    DOMElements.groupSelect.innerHTML = '<option value="">-- Загрузка... --</option>';
    DOMElements.groupEditorModal.classList.remove('hidden');
    try {
        const groups = await api.getGroups();
        DOMElements.groupSelect.innerHTML = '<option value="">-- Выберите группу --</option>';
        groups.forEach(group => {
            const option = document.createElement('option');
            option.value = group.group_name;
            option.textContent = `Группа ${group.group_name} (${group.learner_count} чел.)`;
            DOMElements.groupSelect.appendChild(option);
        });
    } catch (error) {
        ui.showAlert('error', 'Ошибка!', error.message);
        DOMElements.groupEditorModal.classList.add('hidden');
    }
}
function closeGroupEditor() {
    DOMElements.groupEditorModal.classList.add('hidden');
}
async function handleGroupUpdate(e) {
    e.preventDefault();
    const group_name = DOMElements.groupSelect.value;
    if (!group_name) {
        return ui.showAlert('warning', 'Ошибка', 'Пожалуйста, выберите группу.');
    }
    const updates = {};
    const course = DOMElements.groupEditorForm.elements['group-course'].value;
    const specialty = DOMElements.groupEditorForm.elements['group-specialty'].value;
    const sessionSchedule = DOMElements.groupEditorForm.elements['group-sessionSchedule'].value;
    const academicDebts = DOMElements.groupEditorForm.elements['group-academicDebts'].value;
    if (course) updates.course = course;
    if (specialty) updates.specialty = specialty;
    if (sessionSchedule) updates.session_schedule = sessionSchedule;
    if (academicDebts) updates.academic_debts = academicDebts;
    const new_group_name = DOMElements.newGroupNameInput.value.trim();
    if (Object.keys(updates).length === 0 && !new_group_name) {
        return ui.showAlert('info', 'Информация', 'Вы не заполнили ни одного поля для обновления.');
    }
    const requestBody = { group_name, updates };
    if (new_group_name) {
        requestBody.new_group_name = new_group_name;
    }
    if (await ui.showConfirm(`Подтвердите изменения для группы ${group_name}`, 'Это действие затронет всех учащихся в группе!', 'Да, обновить!')) {
        try {
            const resData = await api.updateGroup(requestBody);
            ui.showAlert('success', 'Успех!', resData.message);
            closeGroupEditor();
            initializeDashboard();
            initializeGroups();
        } catch (error) {
            ui.showAlert('error', 'Ошибка!', error.message);
        }
    }
}
async function getGroupCourse(groupName) {
    const params = new URLSearchParams({ searchGroup: groupName, limit: 1 });
    const data = await api.getLearners(params);
    return data.learners && data.learners.length > 0 ? data.learners[0].course : 0;
}
async function changeCourse(increment) {
    const group_name = DOMElements.groupSelect.value;
    if (!group_name) return ui.showAlert('warning', 'Ошибка', 'Сначала выберите группу.');
    try {
        const currentCourse = await getGroupCourse(group_name);
        const nextCourse = Number(currentCourse) + increment;
        const actionText = increment > 0 ? 'Перевести' : 'Понизить курс';
        if (nextCourse < 1) return ui.showAlert('info', 'Внимание', 'Курс не может быть меньше 1.');
        if (await ui.showConfirm(`${actionText} группу ${group_name} на ${nextCourse} курс?`, '', `Да, ${actionText.toLowerCase()}!`)) {
            const resData = await api.updateGroup({ group_name, updates: { course: nextCourse } });
            ui.showAlert('success', 'Успех!', resData.message);
            closeGroupEditor();
        }
    } catch (error) {
        ui.showAlert('error', 'Ошибка!', 'Не удалось определить текущий курс группы.');
    }
}
async function copySchedule() {
    const allGroups = Array.from(DOMElements.groupSelect.options).map(opt => opt.value).filter(val => val);
    const { value: sourceGroup } = await Swal.fire({
        title: 'Скопировать расписание',
        input: 'select',
        inputOptions: allGroups.reduce((acc, group) => ({...acc, [group]: `Из группы ${group}` }), {}),
        inputPlaceholder: 'Выберите группу-источник',
        showCancelButton: true,
    });
    if (sourceGroup) {
        try {
            const params = new URLSearchParams({ searchGroup: sourceGroup, limit: 1 });
            const data = await api.getLearners(params);
            if (data.learners && data.learners.length > 0) {
                const schedule = data.learners[0].session_schedule;
                DOMElements.groupEditorForm.elements['group-sessionSchedule'].value = schedule || '';
                ui.showAlert('info', 'Скопировано!', 'Расписание вставлено в форму.');
            } else {
                throw new Error('В группе-источнике нет учащихся.');
            }
        } catch (error) {
            ui.showAlert('error', 'Ошибка!', error.message);
        }
    }
}
export function initializeGroupEditor() {
    DOMElements.groupEditorBtn.addEventListener('click', openGroupEditor);
    DOMElements.groupEditorCloseBtn.addEventListener('click', closeGroupEditor);
    DOMElements.groupEditorCancelBtn.addEventListener('click', closeGroupEditor);
    DOMElements.groupEditorForm.addEventListener('submit', handleGroupUpdate);
    DOMElements.incrementCourseBtn.addEventListener('click', () => changeCourse(1));
    DOMElements.decrementCourseBtn.addEventListener('click', () => changeCourse(-1));
    DOMElements.copyScheduleBtn.addEventListener('click', copySchedule);
}