const { supabase } = require('../supabase');
const multer = require('multer');
const { pool } = require('../db');
const { logAction } = require('../services/audit.service.js');
// Импортируем отправку ошибок в ТГ
const { sendErrorLogToTelegram } = require('../services/notification.service');

const upload = multer({ storage: multer.memoryStorage() });

// === ФУНКЦИЯ ТРАНСЛИТЕРАЦИИ ===
// Превращает "Проверка" в "Proverka", убирает спецсимволы
const transliterate = (text) => {
    if (!text) return text;
    
    const converter = {
        'а': 'a',    'б': 'b',    'в': 'v',    'г': 'g',    'д': 'd',
        'е': 'e',    'ё': 'e',    'ж': 'zh',   'з': 'z',    'и': 'i',
        'й': 'y',    'к': 'k',    'л': 'l',    'м': 'm',    'н': 'n',
        'о': 'o',    'п': 'p',    'р': 'r',    'с': 's',    'т': 't',
        'у': 'u',    'ф': 'f',    'х': 'h',    'ц': 'c',    'ч': 'ch',
        'ш': 'sh',   'щ': 'sch',  'ь': '',     'ы': 'y',    'ъ': '',
        'э': 'e',    'ю': 'yu',   'я': 'ya',
        'А': 'A',    'Б': 'B',    'В': 'V',    'Г': 'G',    'Д': 'D',
        'Е': 'E',    'Ё': 'E',    'Ж': 'Zh',   'З': 'Z',    'И': 'I',
        'Й': 'Y',    'К': 'K',    'Л': 'L',    'М': 'M',    'Н': 'N',
        'О': 'O',    'П': 'P',    'Р': 'R',    'С': 'S',    'Т': 'T',
        'У': 'U',    'Ф': 'F',    'Х': 'H',    'Ц': 'C',    'Ч': 'Ch',
        'Ш': 'Sh',   'Щ': 'Sch',  'Ь': '',     'Ы': 'Y',    'Ъ': '',
        'Э': 'E',    'Ю': 'Yu',   'Я': 'Ya'
    };
 
    let result = '';
    // Сначала чиним кодировку, если она битая (для безопасности)
    let validText = text;
    try {
        // Попытка исправить кракозябры, если они пришли
        // Но обычно JSON body приходит нормальным, это больше для файлов
    } catch (e) {}

    for (let i = 0; i < validText.length; i++) {
        const char = validText[i];
        if (converter[char]) {
            result += converter[char];
        } else {
            // Оставляем латиницу, цифры и безопасные символы
            // Все остальное (пробелы и т.д.) меняем на underscore или оставляем как есть если безопасно
            if (/[a-zA-Z0-9._-]/.test(char)) {
                result += char;
            } else if (char === ' ') {
                result += '_'; // Пробелы меняем на подчеркивание
            }
        }
    }
    return result;
};
// ===============================

const getMaterials = async (req, res) => {
    const { group_name, path = '' } = req.query;
    if (!group_name) {
        return res.status(400).json({ message: 'Не указана группа.' });
    }
    const basePath = group_name === '_shared' ? 'shared-materials' : `dlya-${group_name}-gruppy`;
    const folderPath = `${basePath}/${path}`;
    try {
        const { data, error } = await supabase.storage
            .from('materials')
            .list(folderPath, {
                limit: 1000,
            });
        if (error) throw error;
        const folders = data.filter(item => item.id === null).map(item => item.name);
        const files = data.filter(item => item.id !== null && item.name !== '.emptyFolderPlaceholder');
        res.status(200).json({ folders, files });
    } catch (error) {
        console.error('Ошибка получения материалов:', error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера.' });
    }
};

const uploadMaterial = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'Файл не был загружен.' });
    }
    const { group_name, path = '' } = req.body;
    const basePath = group_name === '_shared' ? 'shared-materials' : `dlya-${group_name}-gruppy`;
    
    // 1. Чиним кодировку Multer (latin1 -> utf8)
    const originalNameUtf8 = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    
    // 2. Транслитерируем имя (Проверка.pdf -> Proverka.pdf)
    const safeName = transliterate(originalNameUtf8);

    const filePath = `${basePath}/${path ? path + '/' : ''}${safeName}`;
    
    try {
        const { data, error } = await supabase.storage
            .from('materials')
            .upload(filePath, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: false,
            });
        if (error) throw error;
        
        const logTarget = group_name === '_shared' ? 'общую папку' : `группу ${group_name}`;
        await logAction('UPLOAD_MATERIAL', `Загружен файл '${safeName}' (ориг: ${originalNameUtf8}) в ${logTarget}, путь: '${path}'`, req.admin.adminId);
        res.status(201).json({ message: `Файл успешно загружен.` });
    } catch (error) {
        sendErrorLogToTelegram(error, 'Upload Material Error').catch(console.error);
        res.status(500).json({ message: 'Ошибка при загрузке файла.', error: error.message });
    }
};

const createFolder = async (req, res) => {
    const { group_name, path = '', folderName } = req.body;
    
    if (!folderName) {
        return res.status(400).json({ message: 'Не указано имя папки.' });
    }

    // Транслитерация имени папки (Новая папка -> Novaya_papka)
    const safeFolderName = transliterate(folderName);

    const basePath = group_name === '_shared' ? 'shared-materials' : `dlya-${group_name}-gruppy`;
    const filePath = `${basePath}/${path ? path + '/' : ''}${safeFolderName}/.emptyFolderPlaceholder`;
    
    try {
        const { error } = await supabase.storage.from('materials').upload(filePath, Buffer.from(''));
        if (error) throw error;
        
        const logTarget = group_name === '_shared' ? 'общей папке' : `группы ${group_name}`;
        try {
             await logAction('CREATE_FOLDER', `Создана папка '${safeFolderName}' (ориг: ${folderName}) для ${logTarget} в '${path}'`, req.admin.adminId);
        } catch(e) { console.error(e); }

        res.status(201).json({ message: `Папка ${safeFolderName} успешно создана.` });
    } catch (error) {
        sendErrorLogToTelegram(error, 'Create Folder Error').catch(console.error);
        res.status(500).json({ message: 'Ошибка при создании папки.', error: error.message });
    }
};

const deleteMaterial = async (req, res) => {
    const { filePath } = req.body;
    const trashedPath = `_trash/${filePath}`;
    try {
        const { error: moveError } = await supabase.storage.from('materials').move(filePath, trashedPath);
        if (moveError) throw moveError;
        await pool.query(
            'INSERT INTO deleted_materials (original_path, trashed_path, deleted_by_admin_id) VALUES ($1, $2, $3)',
            [filePath, trashedPath, req.admin.adminId]
        );
        await logAction('SOFT_DELETE_MATERIAL', `Файл перемещен в корзину: ${filePath}`, req.admin.adminId);
        res.status(200).json({ message: `Файл ${filePath.split('/').pop()} успешно перемещен в корзину.` });
    } catch (error) {
        console.error('Ошибка перемещения файла в корзину:', error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера.' });
    }
};

const deleteFolder = async (req, res) => {
    const { folderPath } = req.body;
    try {
        const { data: filesInFolder, error: listError } = await supabase.storage.from('materials').list(folderPath);
        if (listError) throw listError;

        const filesToRemove = filesInFolder.map(file => `${folderPath}/${file.name}`);
        if (filesToRemove.length > 0) {
            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                for (const originalPath of filesToRemove) {
                    const trashedPath = `_trash/${originalPath}`;
                    await supabase.storage.from('materials').move(originalPath, trashedPath);
                    await client.query(
                        'INSERT INTO deleted_materials (original_path, trashed_path, deleted_by_admin_id) VALUES ($1, $2, $3)',
                        [originalPath, trashedPath, req.admin.adminId]
                    );
                }
                await client.query('COMMIT');
            } catch (e) {
                await client.query('ROLLBACK');
                throw e;
            } finally {
                client.release();
            }
        }
        await logAction('SOFT_DELETE_FOLDER', `Папка перемещена в корзину: ${folderPath}`, req.admin.adminId);
        res.status(200).json({ message: 'Папка и ее содержимое успешно перемещены в корзину.' });
    } catch (error) {
        console.error('Ошибка перемещения папки в корзину:', error);
        res.status(500).json({ message: 'Ошибка при удалении папки.' });
    }
};

const getSignedUrlForMaterial = async (req, res) => {
    const { filePath } = req.query;
    if (!filePath) {
        return res.status(400).json({ message: 'Не указан путь к файлу.' });
    }
    try {
        const { data, error } = await supabase.storage.from('materials').createSignedUrl(filePath, 60);
        if (error) throw error;
        res.json({ signedUrl: data.signedUrl });
    } catch (error) {
        console.error('Ошибка генерации подписной ссылки:', error);
        res.status(500).json({ message: 'Не удалось сгенерировать ссылку на файл.' });
    }
};

const transferMaterial = async (req, res) => {
    const { filePath, targetGroup, action } = req.body; // action: 'move' или 'copy'

    if (!filePath || !targetGroup || !action) {
        return res.status(400).json({ message: 'Неполные данные запроса.' });
    }

    const baseDestPath = targetGroup === '_shared' ? 'shared-materials' : `dlya-${targetGroup}-gruppy`;
    const fileName = filePath.split('/').pop();
    const destPath = `${baseDestPath}/${fileName}`;

    if (filePath === destPath) {
        return res.status(400).json({ message: 'Исходная и целевая папки совпадают.' });
    }

    try {
        let error;
        if (action === 'move') {
            const { error: moveError } = await supabase.storage.from('materials').move(filePath, destPath);
            error = moveError;
        } else if (action === 'copy') {
            const { error: copyError } = await supabase.storage.from('materials').copy(filePath, destPath);
            error = copyError;
        }

        if (error) throw error;

        const actionText = action === 'move' ? 'Перемещен' : 'Скопирован';
        const targetText = targetGroup === '_shared' ? 'общую папку' : `группу ${targetGroup}`;
        
        await logAction(
            action === 'move' ? 'MOVE_MATERIAL' : 'COPY_MATERIAL', 
            `${actionText} файл '${fileName}' в ${targetText}`, 
            req.admin.adminId
        );

        res.status(200).json({ message: `Файл успешно ${actionText.toLowerCase()}.` });

    } catch (error) {
        console.error(`Ошибка при ${action} файла:`, error);
        res.status(500).json({ message: `Не удалось выполнить операцию: ${error.message}` });
    }
};

module.exports = {
    upload,
    getMaterials,
    uploadMaterial,
    createFolder,
    deleteMaterial,
    deleteFolder,
    getSignedUrlForMaterial,
    transferMaterial,
};