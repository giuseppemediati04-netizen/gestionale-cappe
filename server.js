const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const XLSX = require('xlsx');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Database setup
const db = new sqlite3.Database('./gestionale_cappe.db', (err) => {
    if (err) {
        console.error('Errore connessione database:', err);
    } else {
        console.log('Database connesso');
        initDatabase();
    }
});

// Inizializza il database
function initDatabase() {
    db.run(`CREATE TABLE IF NOT EXISTS cappe (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        inventario TEXT NOT NULL,
        tipologia TEXT NOT NULL,
        matricola TEXT UNIQUE NOT NULL,
        produttore TEXT NOT NULL,
        modello TEXT NOT NULL,
        sede TEXT NOT NULL,
        reparto TEXT NOT NULL,
        locale TEXT NOT NULL,
        data_manutenzione TEXT,
        data_prossima_manutenzione TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) {
            console.error('Errore creazione tabella cappe:', err);
        } else {
            console.log('Tabella cappe pronta');
        }
    });
    
    // Tabella esploso tecnico
    db.run(`CREATE TABLE IF NOT EXISTS esploso (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cappa_id INTEGER NOT NULL,
        dati_motore TEXT,
        dati_filtri TEXT,
        dati_luce_uv TEXT,
        dati_luce_bianca TEXT,
        ore_lavoro_cappa INTEGER DEFAULT 0,
        ore_lavoro_filtri INTEGER DEFAULT 0,
        foto_cappa TEXT,
        foto_motore TEXT,
        foto_filtri TEXT,
        foto_luce_uv TEXT,
        foto_luce_bianca TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cappa_id) REFERENCES cappe(id) ON DELETE CASCADE,
        UNIQUE(cappa_id)
    )`, (err) => {
        if (err) {
            console.error('Errore creazione tabella esploso:', err);
        } else {
            console.log('Tabella esploso pronta');
        }
    });
}

// ============= API ENDPOINTS =============

// GET - Ottieni tutte le cappe
app.get('/api/cappe', (req, res) => {
    db.all('SELECT * FROM cappe ORDER BY inventario ASC', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ data: rows });
        }
    });
});

// GET - Ottieni una cappa specifica
app.get('/api/cappe/:id', (req, res) => {
    db.get('SELECT * FROM cappe WHERE id = ?', [req.params.id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else if (!row) {
            res.status(404).json({ error: 'Cappa non trovata' });
        } else {
            res.json({ data: row });
        }
    });
});

// POST - Aggiungi nuova cappa
app.post('/api/cappe', (req, res) => {
    const {
        inventario,
        tipologia,
        matricola,
        produttore,
        modello,
        sede,
        reparto,
        locale,
        data_manutenzione,
        data_prossima_manutenzione
    } = req.body;

    // Validazione campi obbligatori
    if (!inventario || !tipologia || !matricola || !produttore || !modello || !sede || !reparto || !locale) {
        return res.status(400).json({ error: 'Campi obbligatori mancanti' });
    }

    const sql = `INSERT INTO cappe (
        inventario, tipologia, matricola, produttore, modello, 
        sede, reparto, locale, data_manutenzione, data_prossima_manutenzione
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.run(sql, [
        inventario, tipologia, matricola, produttore, modello,
        sede, reparto, locale, data_manutenzione, data_prossima_manutenzione
    ], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                res.status(400).json({ error: 'Matricola già esistente' });
            } else {
                res.status(500).json({ error: err.message });
            }
        } else {
            res.status(201).json({
                message: 'Cappa aggiunta con successo',
                id: this.lastID
            });
        }
    });
});

// PUT - Aggiorna cappa esistente
app.put('/api/cappe/:id', (req, res) => {
    const {
        inventario,
        tipologia,
        matricola,
        produttore,
        modello,
        sede,
        reparto,
        locale,
        data_manutenzione,
        data_prossima_manutenzione
    } = req.body;

    const sql = `UPDATE cappe SET 
        inventario = ?, tipologia = ?, matricola = ?, produttore = ?, 
        modello = ?, sede = ?, reparto = ?, locale = ?, 
        data_manutenzione = ?, data_prossima_manutenzione = ?,
        updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`;

    db.run(sql, [
        inventario, tipologia, matricola, produttore, modello,
        sede, reparto, locale, data_manutenzione, data_prossima_manutenzione,
        req.params.id
    ], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                res.status(400).json({ error: 'Matricola già esistente' });
            } else {
                res.status(500).json({ error: err.message });
            }
        } else if (this.changes === 0) {
            res.status(404).json({ error: 'Cappa non trovata' });
        } else {
            res.json({ message: 'Cappa aggiornata con successo' });
        }
    });
});

// DELETE - Elimina cappa
app.delete('/api/cappe/:id', (req, res) => {
    db.run('DELETE FROM cappe WHERE id = ?', [req.params.id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else if (this.changes === 0) {
            res.status(404).json({ error: 'Cappa non trovata' });
        } else {
            res.json({ message: 'Cappa eliminata con successo' });
        }
    });
});

// GET - Export Excel
app.get('/api/cappe/export/excel', (req, res) => {
    db.all('SELECT * FROM cappe ORDER BY created_at DESC', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            // Prepara i dati per Excel
            const data = rows.map(row => ({
                'ID': row.id,
                'Inventario': row.inventario,
                'Tipologia': row.tipologia,
                'Matricola': row.matricola,
                'Produttore': row.produttore,
                'Modello': row.modello,
                'Sede': row.sede,
                'Reparto': row.reparto,
                'Locale': row.locale,
                'Data Manutenzione': row.data_manutenzione || '',
                'Data Prossima Manutenzione': row.data_prossima_manutenzione || ''
            }));

            // Crea workbook
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(data);
            XLSX.utils.book_append_sheet(wb, ws, 'Cappe');

            // Genera buffer
            const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

            // Invia file
            res.setHeader('Content-Disposition', 'attachment; filename=cappe_inventario.xlsx');
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.send(buffer);
        }
    });
});

// GET - Ottieni dati esploso per una cappa
app.get('/api/esploso/:cappaId', (req, res) => {
    db.get('SELECT * FROM esploso WHERE cappa_id = ?', [req.params.cappaId], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else if (!row) {
            res.status(404).json({ error: 'Dati esploso non trovati' });
        } else {
            res.json({ data: row });
        }
    });
});

// POST - Salva/Aggiorna dati esploso
app.post('/api/esploso', (req, res) => {
    const {
        cappa_id,
        dati_motore,
        dati_filtri,
        dati_luce_uv,
        dati_luce_bianca,
        ore_lavoro_cappa,
        ore_lavoro_filtri,
        foto_cappa,
        foto_motore,
        foto_filtri,
        foto_luce_uv,
        foto_luce_bianca
    } = req.body;

    if (!cappa_id) {
        return res.status(400).json({ error: 'ID cappa mancante' });
    }

    // Verifica se esiste già un record per questa cappa
    db.get('SELECT id FROM esploso WHERE cappa_id = ?', [cappa_id], (err, existing) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (existing) {
            // Aggiorna
            const updateSql = `UPDATE esploso SET 
                dati_motore = ?, dati_filtri = ?, dati_luce_uv = ?, dati_luce_bianca = ?,
                ore_lavoro_cappa = ?, ore_lavoro_filtri = ?,
                foto_cappa = ?, foto_motore = ?, foto_filtri = ?, foto_luce_uv = ?, foto_luce_bianca = ?,
                updated_at = CURRENT_TIMESTAMP
                WHERE cappa_id = ?`;
            
            db.run(updateSql, [
                dati_motore, dati_filtri, dati_luce_uv, dati_luce_bianca,
                ore_lavoro_cappa, ore_lavoro_filtri,
                foto_cappa, foto_motore, foto_filtri, foto_luce_uv, foto_luce_bianca,
                cappa_id
            ], function(err) {
                if (err) {
                    res.status(500).json({ error: err.message });
                } else {
                    res.json({ message: 'Dati esploso aggiornati con successo' });
                }
            });
        } else {
            // Inserisci nuovo
            const insertSql = `INSERT INTO esploso (
                cappa_id, dati_motore, dati_filtri, dati_luce_uv, dati_luce_bianca,
                ore_lavoro_cappa, ore_lavoro_filtri,
                foto_cappa, foto_motore, foto_filtri, foto_luce_uv, foto_luce_bianca
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            
            db.run(insertSql, [
                cappa_id, dati_motore, dati_filtri, dati_luce_uv, dati_luce_bianca,
                ore_lavoro_cappa, ore_lavoro_filtri,
                foto_cappa, foto_motore, foto_filtri, foto_luce_uv, foto_luce_bianca
            ], function(err) {
                if (err) {
                    res.status(500).json({ error: err.message });
                } else {
                    res.status(201).json({
                        message: 'Dati esploso creati con successo',
                        id: this.lastID
                    });
                }
            });
        }
    });
});

// POST - Import Excel
app.post('/api/cappe/import/excel', express.raw({ type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', limit: '10mb' }), (req, res) => {
    try {
        const workbook = XLSX.read(req.body, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);

        const mode = req.query.mode || 'add'; // 'add' o 'replace'
        
        let inserted = 0;
        let updated = 0;
        let skipped = 0;
        let errors = [];

        const processRow = (index) => {
            if (index >= data.length) {
                return res.json({
                    message: 'Importazione completata',
                    inserted,
                    updated,
                    skipped,
                    errors: errors.length > 0 ? errors : undefined
                });
            }

            const row = data[index];
            
            // Validazione campi obbligatori
            if (!row.Inventario || !row.Tipologia || !row.Matricola || !row.Produttore || 
                !row.Modello || !row.Sede || !row.Reparto || !row.Locale) {
                errors.push(`Riga ${index + 2}: campi obbligatori mancanti`);
                skipped++;
                return processRow(index + 1);
            }

            // Converti date formato italiano (gg/mm/aaaa) in ISO (aaaa-mm-gg)
            const convertDate = (dateStr) => {
                if (!dateStr) return null;
                if (typeof dateStr === 'number') {
                    // Excel date serial number
                    const date = XLSX.SSF.parse_date_code(dateStr);
                    return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
                }
                if (typeof dateStr === 'string') {
                    // Formato gg/mm/aaaa
                    const parts = dateStr.split('/');
                    if (parts.length === 3) {
                        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                    }
                }
                return null;
            };

            const dataManutenzione = convertDate(row['Data Manutenzione']);
            const dataProssimaManutenzione = convertDate(row['Data Prossima Manutenzione']);

            // Verifica se la matricola esiste già
            db.get('SELECT id FROM cappe WHERE matricola = ?', [row.Matricola], (err, existing) => {
                if (err) {
                    errors.push(`Riga ${index + 2}: ${err.message}`);
                    skipped++;
                    return processRow(index + 1);
                }

                if (existing) {
                    if (mode === 'replace') {
                        // Aggiorna
                        const updateSql = `UPDATE cappe SET 
                            inventario = ?, tipologia = ?, produttore = ?, modello = ?,
                            sede = ?, reparto = ?, locale = ?, 
                            data_manutenzione = ?, data_prossima_manutenzione = ?,
                            updated_at = CURRENT_TIMESTAMP
                            WHERE matricola = ?`;
                        
                        db.run(updateSql, [
                            row.Inventario, row.Tipologia, row.Produttore, row.Modello,
                            row.Sede, row.Reparto, row.Locale,
                            dataManutenzione, dataProssimaManutenzione,
                            row.Matricola
                        ], (err) => {
                            if (err) {
                                errors.push(`Riga ${index + 2}: ${err.message}`);
                                skipped++;
                            } else {
                                updated++;
                            }
                            processRow(index + 1);
                        });
                    } else {
                        // Salta
                        skipped++;
                        processRow(index + 1);
                    }
                } else {
                    // Inserisci nuova
                    const insertSql = `INSERT INTO cappe (
                        inventario, tipologia, matricola, produttore, modello,
                        sede, reparto, locale, data_manutenzione, data_prossima_manutenzione
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                    
                    db.run(insertSql, [
                        row.Inventario, row.Tipologia, row.Matricola, row.Produttore, row.Modello,
                        row.Sede, row.Reparto, row.Locale,
                        dataManutenzione, dataProssimaManutenzione
                    ], (err) => {
                        if (err) {
                            errors.push(`Riga ${index + 2}: ${err.message}`);
                            skipped++;
                        } else {
                            inserted++;
                        }
                        processRow(index + 1);
                    });
                }
            });
        };

        processRow(0);

    } catch (error) {
        res.status(400).json({ error: 'Errore nel parsing del file Excel: ' + error.message });
    }
});

// Avvia server
app.listen(PORT, () => {
    console.log(`Server avviato su http://localhost:${PORT}`);
});
