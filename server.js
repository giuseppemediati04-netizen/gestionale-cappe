const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const XLSX = require('xlsx');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS - Permetti tutte le origini
app.use(cors());

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// PostgreSQL Connection Pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test database connection
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Errore connessione PostgreSQL:', err.stack);
    } else {
        console.log('✅ Connesso a PostgreSQL');
        release();
    }
});

// Inizializza il database
async function initDatabase() {
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS cappe (
                id SERIAL PRIMARY KEY,
                inventario VARCHAR(50),
                tipologia VARCHAR(100),
                matricola VARCHAR(100) UNIQUE,
                produttore VARCHAR(100),
                modello VARCHAR(100),
                sede VARCHAR(100),
                reparto VARCHAR(100),
                locale VARCHAR(100),
                note TEXT,
                stato_correttiva VARCHAR(50) DEFAULT 'Operativa',
                data_manutenzione DATE,
                data_prossima_manutenzione DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Tabella cappe pronta');
    } catch (err) {
        console.error('❌ Errore inizializzazione database:', err);
    } finally {
        client.release();
    }
}

// Inizializza il database all'avvio
initDatabase();

// ==================== API ROUTES ====================

// GET - Ottieni tutte le cappe
app.get('/api/cappe', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM cappe ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        console.error('Errore GET /api/cappe:', err);
        res.status(500).json({ error: 'Errore nel recupero dei dati' });
    }
});

// GET - Ottieni una cappa specifica
app.get('/api/cappe/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM cappe WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Cappa non trovata' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Errore GET /api/cappe/:id:', err);
        res.status(500).json({ error: 'Errore nel recupero della cappa' });
    }
});

// POST - Crea nuova cappa
app.post('/api/cappe', async (req, res) => {
    const {
        inventario,
        tipologia,
        matricola,
        produttore,
        modello,
        sede,
        reparto,
        locale,
        note,
        stato_correttiva,
        data_manutenzione,
        data_prossima_manutenzione
    } = req.body;

    try {
        const result = await pool.query(
            `INSERT INTO cappe (
                inventario, tipologia, matricola, produttore, modello, 
                sede, reparto, locale, note, stato_correttiva,
                data_manutenzione, data_prossima_manutenzione
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
            RETURNING *`,
            [
                inventario || null,
                tipologia || null,
                matricola || null,
                produttore || null,
                modello || null,
                sede || null,
                reparto || null,
                locale || null,
                note || null,
                stato_correttiva || 'Operativa',
                data_manutenzione || null,
                data_prossima_manutenzione || null
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Errore POST /api/cappe:', err);
        if (err.code === '23505') { // Unique violation
            res.status(400).json({ error: 'Matricola già esistente' });
        } else {
            res.status(500).json({ error: 'Errore nella creazione della cappa' });
        }
    }
});

// PUT - Aggiorna cappa
app.put('/api/cappe/:id', async (req, res) => {
    const {
        inventario,
        tipologia,
        matricola,
        produttore,
        modello,
        sede,
        reparto,
        locale,
        note,
        stato_correttiva,
        data_manutenzione,
        data_prossima_manutenzione
    } = req.body;

    try {
        const result = await pool.query(
            `UPDATE cappe SET 
                inventario = $1,
                tipologia = $2,
                matricola = $3,
                produttore = $4,
                modello = $5,
                sede = $6,
                reparto = $7,
                locale = $8,
                note = $9,
                stato_correttiva = $10,
                data_manutenzione = $11,
                data_prossima_manutenzione = $12,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $13
            RETURNING *`,
            [
                inventario || null,
                tipologia || null,
                matricola || null,
                produttore || null,
                modello || null,
                sede || null,
                reparto || null,
                locale || null,
                note || null,
                stato_correttiva || 'Operativa',
                data_manutenzione || null,
                data_prossima_manutenzione || null,
                req.params.id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Cappa non trovata' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Errore PUT /api/cappe/:id:', err);
        if (err.code === '23505') { // Unique violation
            res.status(400).json({ error: 'Matricola già esistente' });
        } else {
            res.status(500).json({ error: 'Errore nell\'aggiornamento della cappa' });
        }
    }
});

// DELETE - Elimina cappa
app.delete('/api/cappe/:id', async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM cappe WHERE id = $1 RETURNING *', [req.params.id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Cappa non trovata' });
        }

        res.json({ message: 'Cappa eliminata con successo' });
    } catch (err) {
        console.error('Errore DELETE /api/cappe/:id:', err);
        res.status(500).json({ error: 'Errore nell\'eliminazione della cappa' });
    }
});

// POST - Importa da Excel
app.post('/api/cappe/import', async (req, res) => {
    try {
        const { data } = req.body;
        
        if (!data || !Array.isArray(data)) {
            return res.status(400).json({ error: 'Dati non validi' });
        }

        let importati = 0;
        let errori = [];

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            try {
                await pool.query(
                    `INSERT INTO cappe (
                        inventario, tipologia, matricola, produttore, modello,
                        sede, reparto, locale, note, stato_correttiva,
                        data_manutenzione, data_prossima_manutenzione
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                    [
                        row.inventario || null,
                        row.tipologia || null,
                        row.matricola || null,
                        row.produttore || null,
                        row.modello || null,
                        row.sede || null,
                        row.reparto || null,
                        row.locale || null,
                        row.note || null,
                        row.stato_correttiva || 'Operativa',
                        row.data_manutenzione || null,
                        row.data_prossima_manutenzione || null
                    ]
                );
                importati++;
            } catch (err) {
                errori.push({ riga: i + 1, errore: err.message });
            }
        }

        res.json({
            successo: true,
            importati,
            errori: errori.length,
            dettagli: errori
        });
    } catch (err) {
        console.error('Errore importazione:', err);
        res.status(500).json({ error: 'Errore durante l\'importazione' });
    }
});

// GET - Esporta in Excel
app.get('/api/cappe/export', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM cappe ORDER BY id');
        
        // Crea workbook
        const ws = XLSX.utils.json_to_sheet(result.rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Cappe');
        
        // Genera buffer
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        
        res.setHeader('Content-Disposition', 'attachment; filename=cappe_export.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (err) {
        console.error('Errore esportazione:', err);
        res.status(500).json({ error: 'Errore durante l\'esportazione' });
    }
});

// GET - Statistiche dashboard
app.get('/api/stats', async (req, res) => {
    try {
        const totaleResult = await pool.query('SELECT COUNT(*) as totale FROM cappe');
        const totale = parseInt(totaleResult.rows[0].totale);

        const operativeResult = await pool.query(
            "SELECT COUNT(*) as count FROM cappe WHERE stato_correttiva = 'Operativa'"
        );
        const operative = parseInt(operativeResult.rows[0].count);

        const manutenzioneResult = await pool.query(
            "SELECT COUNT(*) as count FROM cappe WHERE stato_correttiva = 'In Manutenzione'"
        );
        const inManutenzione = parseInt(manutenzioneResult.rows[0].count);

        const scaduteResult = await pool.query(
            'SELECT COUNT(*) as count FROM cappe WHERE data_prossima_manutenzione < CURRENT_DATE'
        );
        const scadute = parseInt(scaduteResult.rows[0].count);

        const imminenteResult = await pool.query(
            `SELECT COUNT(*) as count FROM cappe 
             WHERE data_prossima_manutenzione >= CURRENT_DATE 
             AND data_prossima_manutenzione <= CURRENT_DATE + INTERVAL '30 days'`
        );
        const imminente = parseInt(imminenteResult.rows[0].count);

        res.json({
            totale,
            operative,
            inManutenzione,
            scadute,
            imminente
        });
    } catch (err) {
        console.error('Errore statistiche:', err);
        res.status(500).json({ error: 'Errore nel recupero delle statistiche' });
    }
});

// Serve static files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', database: 'postgresql' });
});

// Avvio server
app.listen(PORT, () => {
    console.log(`🚀 Server avviato su porta ${PORT}`);
    console.log(`📊 Database: PostgreSQL`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
});

// Gestione chiusura graceful
process.on('SIGINT', async () => {
    console.log('\n🛑 Chiusura server...');
    await pool.end();
    process.exit(0);
});
