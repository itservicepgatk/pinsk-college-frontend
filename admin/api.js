import { API_URL } from './config.js';
import { state } from './state.js';

async function fetchWithAuth(endpoint, options = {}) {
    const headers = { ...options.headers };
    if (state.token) {
        headers['Authorization'] = `Bearer ${state.token}`;
    }
    const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message);
    }
    return response.json();
}

async function fetchWithAuthFormData(endpoint, formData) {
    const headers = {};
    if (state.token) {
        headers['Authorization'] = `Bearer ${state.token}`;
    }
    const response = await fetch(`${API_URL}${endpoint}`, { method: 'POST', headers, body: formData });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message);
    }
    return response.json();
}

export const adminLogin = (login, password) => fetch(`${API_URL}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, password })
});

export const getLearners = (params) => fetchWithAuth(`/api/learners?${params.toString()}`);
export const createLearner = (data) => fetchWithAuth('/api/learners', { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } });
export const updateLearner = (id, data) => fetchWithAuth(`/api/learners/${id}`, { method: 'PUT', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } });
export const deleteLearner = (id) => fetchWithAuth(`/api/learners/${id}`, { method: 'DELETE' });
export const deleteMultipleLearners = (ids) => fetchWithAuth('/api/learners', { method: 'DELETE', body: JSON.stringify({ ids }), headers: { 'Content-Type': 'application/json' } });
export const exportLearners = () => fetchWithAuth('/api/learners/export');
export const importLearners = (learners) => fetchWithAuth('/api/learners/import', { method: 'POST', body: JSON.stringify({ learners }), headers: { 'Content-Type': 'application/json' } });

export const getGroups = () => fetchWithAuth('/api/stats/groups');
export const updateGroup = (data) => fetchWithAuth('/api/learners/groups/update', { method: 'PUT', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } });
export const deleteGroup = (groupName) => fetchWithAuth(`/api/learners/groups/${encodeURIComponent(groupName)}`, { method: 'DELETE' });

export const getDashboardStats = () => fetchWithAuth('/api/stats');
export const getMaterials = (groupName, path) => fetchWithAuth(`/api/materials?group_name=${groupName}&path=${path}`);
export const deleteMaterial = (filePath) => fetchWithAuth('/api/materials/delete', { method: 'DELETE', body: JSON.stringify({ filePath }), headers: { 'Content-Type': 'application/json' } });
export const getSignedMaterialUrl = (filePath) => fetchWithAuth(`/api/materials/signed-url?filePath=${encodeURIComponent(filePath)}`);

export const uploadMaterialWithProgress = (formData, progressCallback) => {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_URL}/api/materials/upload`, true);

        if (state.token) {
            xhr.setRequestHeader('Authorization', `Bearer ${state.token}`);
        }

        xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
                progressCallback(event);
            }
        });

        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve(JSON.parse(xhr.responseText));
            } else {
                let error;
                try {
                    error = JSON.parse(xhr.responseText);
                } catch (e) {
                    error = { message: xhr.statusText };
                }
                reject(new Error(error.message));
            }
        });

        xhr.addEventListener('error', () => reject(new Error('Network error during upload.')));
        xhr.addEventListener('abort', () => reject(new Error('Upload aborted.')));

        xhr.send(formData);
    });
};

export const getAuditLogs = (params) => fetchWithAuth(`/api/audit?${params.toString()}`);
export const getAuditActionTypes = () => fetchWithAuth('/api/audit/actions');
export const deleteAuditLog = (id) => fetchWithAuth(`/api/audit/${id}`, { method: 'DELETE' });
export const exportAuditLogs = (params) => fetchWithAuth(`/api/audit/export?${params.toString()}`);
export const clearAuditLogs = (data) => fetchWithAuth('/api/audit/clear', { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } });
export const logLogout = (data) => fetchWithAuth('/api/audit/logout', { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } });

export const getAdmins = () => fetchWithAuth('/api/admins');
export const createAdmin = (data) => fetchWithAuth('/api/admins', { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } });
export const deleteAdmin = (id) => fetchWithAuth(`/api/admins/${id}`, { method: 'DELETE' });

export const getBackups = () => fetchWithAuth('/api/backups');
export const createBackup = () => fetchWithAuth('/api/backups', { method: 'POST' });
export const restoreBackup = (fileName) => fetchWithAuth('/api/backups/restore', { method: 'POST', body: JSON.stringify({ fileName }), headers: { 'Content-Type': 'application/json' } });
export const deleteBackup = (data) => fetchWithAuth('/api/backups', { method: 'DELETE', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } });

export const getMaintenanceStatus = () => fetch(`${API_URL}/api/settings/maintenance`).then(res => res.json());
export const setMaintenanceStatus = (data) => fetchWithAuth('/api/settings/maintenance', { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } });

export const getSessionLogs = (params) => fetchWithAuth(`/api/sessions?${params.toString()}`);

export const getDebtors = () => fetchWithAuth('/api/learners/debtors');

export const getAnnouncements = () => fetchWithAuth('/api/announcements');
export const createAnnouncement = (formData) => fetchWithAuthFormData('/api/announcements', formData);
export const updateAnnouncement = (id, data) => fetchWithAuth(`/api/announcements/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' }
});
export const deleteAnnouncement = (id) => fetchWithAuth(`/api/announcements/${id}`, { method: 'DELETE' });

export const resetGroupPasswords = async (groupName) => {
    const response = await fetch(`${API_URL}/api/learners/groups/reset-passwords`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${state.token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ group_name: groupName })
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message);
    }
    return response.text();
};

export const getLearnerProfile = (id) => fetchWithAuth(`/api/learners/${id}/profile`);

export const getDebtorsReportCsv = async () => {
    const response = await fetch(`${API_URL}/api/reports/debtors-csv`, {
        headers: { 'Authorization': `Bearer ${state.token}` }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message);
    }

    const disposition = response.headers.get('content-disposition');
    const fileNameMatch = disposition && disposition.match(/filename="(.+?)"/);
    const fileName = fileNameMatch ? fileNameMatch[1] : 'report.csv';

    const csvData = await response.text();
    return { csvData, fileName };
};

export const createMaterialFolder = (data) => fetchWithAuth('/api/materials/folder', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' }
});

export const deleteMaterialFolder = (folderPath) => fetchWithAuth('/api/materials/folder', {
    method: 'DELETE',
    body: JSON.stringify({ folderPath }),
    headers: { 'Content-Type': 'application/json' }
});

export const transferMaterial = (filePath, targetGroup, action) => fetchWithAuth('/api/materials/transfer', {
    method: 'POST',
    body: JSON.stringify({ filePath, targetGroup, action }),
    headers: { 'Content-Type': 'application/json' }
});

export const getAllTemplates = () => fetchWithAuth('/api/templates');
export const createTemplate = (data) => fetchWithAuth('/api/templates', { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } });
export const updateTemplate = (id, data) => fetchWithAuth(`/api/templates/${id}`, { method: 'PUT', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } });
export const deleteTemplate = (id) => fetchWithAuth(`/api/templates/${id}`, { method: 'DELETE' });

export const globalSearch = (term) => fetchWithAuth(`/api/search/global?term=${encodeURIComponent(term)}`);

export const getTrashItems = () => fetchWithAuth('/api/trash');
export const restoreTrashItem = (type, id) => fetchWithAuth('/api/trash/restore', { method: 'POST', body: JSON.stringify({ type, id }), headers: { 'Content-Type': 'application/json' } });
export const permanentlyDeleteTrashItem = (type, id) => fetchWithAuth('/api/trash/delete-permanent', { method: 'POST', body: JSON.stringify({ type, id }), headers: { 'Content-Type': 'application/json' } });

export const deleteTrashItems = (type, ids) => fetchWithAuth('/api/trash/delete-multiple', { 
    method: 'POST', 
    body: JSON.stringify({ type, ids }), 
    headers: { 'Content-Type': 'application/json' } 
});

export const emptyTrash = (type) => fetchWithAuth('/api/trash/empty', { 
    method: 'POST', 
    body: JSON.stringify({ type }), 
    headers: { 'Content-Type': 'application/json' } 
});

export const getSystemUpdates = () => fetchWithAuth('/api/updates');
export const createSystemUpdate = (data) => fetchWithAuth('/api/updates', { 
    method: 'POST', 
    body: JSON.stringify(data), 
    headers: { 'Content-Type': 'application/json' } 
});
export const updateSystemUpdate = (id, data) => fetchWithAuth(`/api/updates/${id}`, { 
    method: 'PUT', 
    body: JSON.stringify(data), 
    headers: { 'Content-Type': 'application/json' } 
});
export const deleteSystemUpdate = (id) => fetchWithAuth(`/api/updates/${id}`, { method: 'DELETE' });

export const checkUpdates = () => fetchWithAuth('/api/updates/check');

export const resetAdminPassword = (id, newPassword) => fetchWithAuth(`/api/admins/${id}/password`, {
    method: 'PUT',
    body: JSON.stringify({ newPassword }),
    headers: { 'Content-Type': 'application/json' }
});