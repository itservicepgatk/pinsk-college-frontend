export const DOMElements = {
    // --- LOGIN ---
    adminLoginContainer: document.getElementById('admin-login-view-container'),
    adminLoginForm: document.getElementById('admin-login-form'),
    adminLoader: document.getElementById('admin-loader'),
    adminErrorMessage: document.getElementById('admin-error-message'),
    
    // --- LAYOUT ---
    dashboardContainer: document.getElementById('dashboard-container'),
    logoutButton: document.getElementById('logout-button'),
    dashboardTitle: document.getElementById('dashboard-title'),
    
    // --- VIEWS ---
    groupsView: document.getElementById('groups-view'),
    learnersView: document.getElementById('learners-view'),
    groupsContainer: document.getElementById('groups-container'),
    
    // --- LEARNERS LIST ---
    backToGroupsBtn: document.getElementById('back-to-groups-btn'),
    allLearnersBtn: document.getElementById('all-learners-btn'),
    addLearnerBtn: document.getElementById('add-learner-btn'),
    importCsvBtn: document.getElementById('import-csv-btn'),
    exportCsvBtn: document.getElementById('export-csv-btn'),
    csvFileInput: document.getElementById('csv-file-input'),
    importInstructionsBtn: document.getElementById('import-instructions-btn'),
    downloadTemplateBtn: document.getElementById('download-template-btn'),
    
    searchInput: document.getElementById('search-input'),
    groupFilterSelect: document.getElementById('group-filter-select'),
    
    // !!! ВОТ ЭТИ ЭЛЕМЕНТЫ ВАЖНЫ ДЛЯ МАССОВОГО УДАЛЕНИЯ !!!
    deleteSelectedBtn: document.getElementById('delete-selected-btn'),
    selectAllCheckbox: document.getElementById('select-all-checkbox'),
    
    learnersTableBody: document.getElementById('learners-table-body'),
    tableHead: document.getElementById('table-head'),

    // --- STATS ---
    totalLearnersStat: document.getElementById('total-learners-stat'),
    debtorsCountStat: document.getElementById('debtors-count-stat'),
    detailsBtn: document.getElementById('details-btn'),
    detailsDebtorsBtn: document.getElementById('details-debtors-btn'),

    // --- MODALS ---
    modal: document.getElementById('modal'),
    modalTitle: document.getElementById('modal-title'),
    learnerForm: document.getElementById('learner-form'),
    cancelBtn: document.getElementById('cancel-btn'),
    generatePasswordBtn: document.getElementById('generate-password-btn'),

    detailsModal: document.getElementById('details-modal'),
    detailsModalCloseBtn: document.getElementById('details-modal-close-btn'),
    groupsStatsTableBody: document.getElementById('groups-stats-table-body'),

    groupEditorBtn: document.getElementById('group-editor-btn'),
    groupEditorModal: document.getElementById('group-editor-modal'),
    groupEditorCloseBtn: document.getElementById('group-editor-close-btn'),
    groupEditorCancelBtn: document.getElementById('group-editor-cancel-btn'),
    groupEditorForm: document.getElementById('group-editor-form'),
    groupSelect: document.getElementById('group-select'),
    newGroupNameInput: document.getElementById('new-group-name'),
    incrementCourseBtn: document.getElementById('increment-course-btn'),
    decrementCourseBtn: document.getElementById('decrement-course-btn'),
    copyScheduleBtn: document.getElementById('copy-schedule-btn'),
    resetPasswordsBtn: document.getElementById('reset-passwords-btn'),

    debtorsModal: document.getElementById('debtors-modal'),
    debtorsModalCloseBtn: document.getElementById('debtors-modal-close-btn'),
    debtorsTableBody: document.getElementById('debtors-table-body'),

    // --- MATERIALS ---
    materialManagerBtn: document.getElementById('material-manager-btn'),
    materialManagerModal: document.getElementById('material-manager-modal'),
    materialManagerCloseBtn: document.getElementById('material-manager-close-btn'),
    materialGroupSelect: document.getElementById('material-group-select'),
    materialManagerForm: document.getElementById('material-manager-form'),
    
    // --- AUDIT & SYSTEM ---
    auditLogBtn: document.getElementById('fab-audit'),
    auditLogModal: document.getElementById('audit-log-modal'),
    auditLogCloseBtn: document.getElementById('audit-log-close-btn'),
    auditLogTableBody: document.getElementById('audit-log-table-body'),
    auditAdminFilter: document.getElementById('audit-admin-filter'),
    auditActionFilter: document.getElementById('audit-action-filter'),
    auditStartDate: document.getElementById('audit-start-date'),
    auditEndDate: document.getElementById('audit-end-date'),
    auditSearchInput: document.getElementById('audit-search-input'),
    auditApplyFiltersBtn: document.getElementById('audit-apply-filters-btn'),
    auditResetFiltersBtn: document.getElementById('audit-reset-filters-btn'),
    exportAuditLogBtn: document.getElementById('export-audit-log-btn'),
    clearAuditLogBtn: document.getElementById('clear-audit-log-btn'),

    manageAdminsBtn: document.getElementById('manage-admins-btn'),
    manageAdminsModal: document.getElementById('manage-admins-modal'),
    manageAdminsCloseBtn: document.getElementById('manage-admins-close-btn'),
    addAdminForm: document.getElementById('add-admin-form'),
    adminsTableBody: document.getElementById('admins-table-body'),

    manageBackupsBtn: document.getElementById('manage-backups-btn'),
    backupManagerModal: document.getElementById('backup-manager-modal'),
    backupManagerCloseBtn: document.getElementById('backup-manager-close-btn'),
    createBackupManualBtn: document.getElementById('create-backup-manual-btn'),
    backupListContainer: document.getElementById('backup-list-container'),

    sessionsManagerBtn: document.getElementById('fab-session'),
    sessionsManagerModal: document.getElementById('sessions-manager-modal'),
    sessionsManagerCloseBtn: document.getElementById('sessions-manager-close-btn'),
    sessionsLogTableBody: document.getElementById('sessions-log-table-body'),

    // --- CONTENT ---
    announcementsBtn: document.getElementById('announcements-btn'),
    announcementsModal: document.getElementById('announcements-modal'),
    announcementsCloseBtn: document.getElementById('announcements-close-btn'),
    announcementForm: document.getElementById('announcement-form'),

    reportsBtn: document.getElementById('reports-btn'),
    reportsModal: document.getElementById('reports-modal'),
    reportsCloseBtn: document.getElementById('reports-close-btn'),
    generateDebtorsCsvBtn: document.getElementById('generate-debtors-csv-btn'),
    
    // --- HELP ---
    helpBtn: document.getElementById('help-btn'),
    helpModal: document.getElementById('help-modal'),
    helpCloseBtn: document.getElementById('help-close-btn'),
};