
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const esbuild = require('esbuild');
const nodemailer = require('nodemailer');
const app = express();
const port = 3000;

// --- Versioned Backup Logic ---
async function createVersionedBackup() {
    try {
        const sourcePath = path.join(__dirname, 'db.json');
        const backupDir = path.join(__dirname, 'backup');
        
        // Ensure source file exists
        try {
            await fs.access(sourcePath);
        } catch (e) {
            return;
        }

        const dataString = await fs.readFile(sourcePath, 'utf-8');
        const db = JSON.parse(dataString);
        
        // Don't backup if the DB is practically empty (protection against bad saves)
        if (!db.projects || db.projects.length === 0) {
            console.log('Skipping backup: Database appears empty.');
            return;
        }

        await fs.mkdir(backupDir, { recursive: true });
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(backupDir, `db_backup_${timestamp}.json`);
        await fs.writeFile(backupPath, dataString);
        
        console.log(`Backup created: ${backupPath}`);

        // Prune old backups (keep only latest 3)
        const files = await fs.readdir(backupDir);
        const backupFiles = files
            .filter(f => f.startsWith('db_backup_') && f.endsWith('.json'))
            .map(f => ({
                name: f,
                path: path.join(backupDir, f),
                time: fs.stat(path.join(backupDir, f)).then(s => s.mtime.getTime())
            }));

        const resolvedFiles = await Promise.all(backupFiles.map(async f => ({ ...f, time: await f.time })));
        resolvedFiles.sort((a, b) => b.time - a.time);

        if (resolvedFiles.length > 3) {
            const toDelete = resolvedFiles.slice(3);
            for (const file of toDelete) {
                await fs.unlink(file.path);
                console.log(`Pruned old backup: ${file.name}`);
            }
        }
    } catch (error) {
        console.error('Failed to create versioned backup:', error);
    }
}

// Run backup every 6 hours
setInterval(createVersionedBackup, 6 * 60 * 60 * 1000);

app.use(express.json({ limit: '10mb' }));

// List available backups
app.get('/api/backups/list', async (req, res) => {
    try {
        const backupDir = path.join(__dirname, 'backup');
        await fs.mkdir(backupDir, { recursive: true });
        const files = await fs.readdir(backupDir);
        
        const backupFiles = await Promise.all(
            files
                .filter(f => f.startsWith('db_backup_') && f.endsWith('.json'))
                .map(async f => {
                    const stats = await fs.stat(path.join(backupDir, f));
                    return {
                        filename: f,
                        date: stats.mtime.toISOString()
                    };
                })
        );

        res.json(backupFiles.sort((a, b) => new Date(b.date) - new Date(a.date)));
    } catch (error) {
        res.status(500).json({ error: 'Failed to list backups' });
    }
});

// Restore specific backup
app.post('/api/restore-backup', async (req, res) => {
    const { filename } = req.body;
    if (!filename) return res.status(400).json({ error: 'Filename required' });

    try {
        const backupPath = path.join(__dirname, 'backup', filename);
        const data = await fs.readFile(backupPath, 'utf-8');
        
        // Validate JSON before overwriting
        JSON.parse(data); 

        await fs.writeFile(path.join(__dirname, 'db.json'), data);
        res.json({ message: 'Restore successful' });
    } catch (error) {
        res.status(500).json({ error: 'Restore failed: ' + error.message });
    }
});

// SMTP route
app.post('/api/smtp/send', async (req, res) => {
    const { smtpConfig, to, subject, text, html } = req.body;
    if (!smtpConfig || !to || !subject || (!text && !html)) {
        return res.status(400).json({ error: 'Missing required parameters for SMTP email.' });
    }
    const transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        auth: { user: smtpConfig.user, pass: smtpConfig.pass },
        tls: { rejectUnauthorized: false }
    });
    try {
        await transporter.verify();
        const info = await transporter.sendMail({
            from: `"${smtpConfig.fromName || 'Roadmapper'}" <${smtpConfig.from}>`,
            to: to,
            subject: subject,
            text: text,
            html: html,
        });
        res.status(200).json({ message: 'Email sent successfully.' });
    } catch (error) {
        res.status(500).json({ error: `SMTP error: ${error.message}` });
    }
});

// Get/Save Data
app.get('/api/data', async (req, res) => {
    try {
        const data = await fs.readFile(path.join(__dirname, 'db.json'), 'utf-8');
        res.json(JSON.parse(data));
    } catch (error) {
        if (error.code === 'ENOENT') res.status(404).json({ message: 'Not found' });
        else res.status(500).json({ error: 'Read error' });
    }
});

app.post('/api/data', async (req, res) => {
    try {
        // Protect against empty body saves
        if (!req.body || !req.body.projects) {
            return res.status(400).json({ error: 'Invalid data format' });
        }
        const dataString = JSON.stringify(req.body, null, 2);
        await fs.writeFile(path.join(__dirname, 'db.json'), dataString);
        res.status(200).json({ message: 'Saved' });
    } catch (error) {
        res.status(500).json({ error: 'Save error' });
    }
});

app.use(async (req, res, next) => {
    const filePath = path.join(__dirname, req.path);
    if (req.path.endsWith('.tsx') || req.path.endsWith('.ts')) {
        try {
            await fs.access(filePath);
            const result = await esbuild.build({
                entryPoints: [filePath],
                bundle: true,
                write: false,
                format: 'esm',
                loader: { '.tsx': 'tsx', '.ts': 'ts' },
                external: ['react', 'react-dom/*', 'react/*'],
            });
            res.set('Content-Type', 'application/javascript');
            res.send(result.outputFiles[0].text);
        } catch (error) {
            if (error.code !== 'ENOENT') res.status(500).send('Compilation error');
            else next();
        }
    } else {
        next();
    }
});

app.use(express.static(__dirname));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
