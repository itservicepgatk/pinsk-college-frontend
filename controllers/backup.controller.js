const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const { logAction } = require('../services/audit.service.js');
const { R2 } = require('../r2');
const { 
    PutObjectCommand, 
    ListObjectsV2Command, 
    GetObjectCommand, 
    DeleteObjectCommand,
    DeleteObjectsCommand 
} = require('@aws-sdk/client-s3');

const { DATABASE_URL, R2_BUCKET_NAME } = process.env;

const createAndUploadBackup = async (adminId = null) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `backup-${timestamp}.sql`;
  const tempFilePath = path.join('/tmp', fileName);
  const dumpCommand = `pg_dump --clean --no-owner --no-privileges "${DATABASE_URL}" > ${tempFilePath}`;

  return new Promise((resolve, reject) => {
    exec(dumpCommand, async (error) => {
      if (error) {
        console.error(`Ошибка pg_dump: ${error.message}`);
        return reject(new Error('Ошибка при создании дампа базы данных.'));
      }
      try {
        const fileStream = fs.createReadStream(tempFilePath);
        const uploadParams = {
          Bucket: R2_BUCKET_NAME,
          Key: fileName,
          Body: fileStream,
        };
        await R2.send(new PutObjectCommand(uploadParams));
        if (adminId) {
          await logAction('CREATE_BACKUP', `Создана резервная копия: ${fileName}`, adminId);
        }
        resolve(fileName);
      } catch (e) {
        console.error('Ошибка при загрузке в R2:', e);
        reject(new Error('Не удалось загрузить резервную копию в хранилище.'));
      } finally {
        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
      }
    });
  });
};

const deleteOldBackups = async () => {
    try {
        const listCommand = new ListObjectsV2Command({ Bucket: R2_BUCKET_NAME });
        const { Contents = [] } = await R2.send(listCommand);
        
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
        
        const objectsToDelete = Contents
            .filter(obj => new Date(obj.LastModified) < sevenDaysAgo)
            .map(obj => ({ Key: obj.Key }));

        if (objectsToDelete.length > 0) {
            const deleteCommand = new DeleteObjectsCommand({
                Bucket: R2_BUCKET_NAME,
                Delete: { Objects: objectsToDelete }
            });
            await R2.send(deleteCommand);
            console.log(`[AUTO-CLEANUP] Удалено старых бэкапов: ${objectsToDelete.length}`);
            return objectsToDelete.length;
        }
        
        console.log('[AUTO-CLEANUP] Старых бэкапов для удаления не найдено.');
        return 0;
    } catch (error) {
        console.error('[AUTO-CLEANUP] Ошибка при автоматическом удалении старых бэкапов:', error);
        throw error;
    }
};

const createBackupHandler = async (req, res) => {
    try {
        const fileName = await createAndUploadBackup(req.admin.adminId);
        res.status(200).json({ message: `Резервная копия ${fileName} успешно создана и загружена в хранилище.` });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Ошибка на сервере при создании резервной копии.' });
    }
};

const listBackups = async (req, res) => {
    try {
        const command = new ListObjectsV2Command({ Bucket: R2_BUCKET_NAME });
        const { Contents = [] } = await R2.send(command);
        const backups = Contents
            .sort((a, b) => b.LastModified - a.LastModified)
            .map(obj => ({
                name: obj.Key,
                created_at: obj.LastModified,
            }));
        res.json(backups);
    } catch (error) {
        console.error('Ошибка при получении списка бэкапов:', error);
        res.status(500).json({ message: 'Не удалось получить список резервных копий.' });
    }
};

const restoreBackup = async (req, res) => {
    const { fileName } = req.body;
    if (!fileName) {
        return res.status(400).json({ message: 'Не указано имя файла для восстановления.' });
    }
    const tempFilePath = path.join('/tmp', fileName);
    try {
        const command = new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: fileName });
        const { Body } = await R2.send(command);
        const writer = fs.createWriteStream(tempFilePath);
        Body.pipe(writer);
        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
        const restoreCommand = `psql "${DATABASE_URL}" < ${tempFilePath}`;
        exec(restoreCommand, async (error) => {
            if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
            if (error) {
                console.error(`Ошибка psql: ${error.message}`);
                return res.status(500).json({ message: 'Ошибка в процессе восстановления базы данных.' });
            }
            await logAction('RESTORE_BACKUP', `Выполнено восстановление из файла: ${fileName}`, req.admin.adminId);
            res.status(200).json({ message: 'База данных успешно восстановлена. Рекомендуется перезагрузить страницу.' });
        });
    } catch (error) {
        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
        console.error('Ошибка при восстановлении:', error);
        res.status(500).json({ message: 'Не удалось восстановить резервную копию.' });
    }
};

const deleteBackup = async (req, res) => {
  const { fileName, password } = req.body;
  const adminId = req.admin.adminId;

  if (!fileName || !password) {
    return res.status(400).json({ message: 'Необходимо указать имя файла и пароль.' });
  }

  try {
    const adminResult = await pool.query('SELECT password_hash FROM admins WHERE id = $1', [adminId]);
    if (adminResult.rows.length === 0) {
      return res.status(404).json({ message: 'Администратор не найден.' });
    }
    const admin = adminResult.rows[0];
    const isPasswordCorrect = await bcrypt.compare(password, admin.password_hash);

    if (!isPasswordCorrect) {
      return res.status(401).json({ message: 'Неверный пароль.' });
    }

    const deleteParams = {
      Bucket: R2_BUCKET_NAME,
      Key: fileName,
    };
    await R2.send(new DeleteObjectCommand(deleteParams));
    
    await logAction('DELETE_BACKUP', `Удалена резервная копия: ${fileName}`, adminId);

    res.status(200).json({ message: `Резервная копия ${fileName} успешно удалена.` });

  } catch (error) {
    console.error('Ошибка при удалении резервной копии:', error);
    if (error.name === 'NoSuchKey') {
        return res.status(404).json({ message: 'Файл не найден в хранилище.' });
    }
    res.status(500).json({ message: 'Внутренняя ошибка сервера при удалении файла.' });
  }
};

module.exports = { 
    createAndUploadBackup,
    deleteOldBackups,
    createBackupHandler, 
    listBackups, 
    restoreBackup,
    deleteBackup,
};