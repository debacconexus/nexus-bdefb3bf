const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database initialization
async function initializeDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS planetary_cycles (
        id SERIAL PRIMARY KEY,
        planet VARCHAR(50) NOT NULL,
        cycle_type VARCHAR(100) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE,
        current_phase VARCHAR(100),
        astro_sign VARCHAR(30),
        tarot_card VARCHAR(100),
        energy_type VARCHAR(50),
        influence_description TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS tarot_associations (
        id SERIAL PRIMARY KEY,
        card_name VARCHAR(100) NOT NULL,
        card_type VARCHAR(30),
        planetary_ruler VARCHAR(50),
        astrological_sign VARCHAR(30),
        element VARCHAR(20),
        cycle_influence TEXT,
        energy_keywords TEXT[],
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS astrological_aspects (
        id SERIAL PRIMARY KEY,
        aspect_name VARCHAR(50) NOT NULL,
        planet_one VARCHAR(50) NOT NULL,
        planet_two VARCHAR(50) NOT NULL,
        aspect_type VARCHAR(30),
        degree_separation DECIMAL(5,2),
        start_date TIMESTAMP,
        peak_date TIMESTAMP,
        end_date TIMESTAMP,
        influence_level VARCHAR(20),
        description TEXT,
        tarot_guidance VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS cycle_categories (
        id SERIAL PRIMARY KEY,
        category_name VARCHAR(100) NOT NULL,
        category_type VARCHAR(50),
        description TEXT,
        color_code VARCHAR(7),
        icon_symbol VARCHAR(10),
        associated_elements TEXT[],
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS infographic_data (
        id SERIAL PRIMARY KEY,
        section_name VARCHAR(100) NOT NULL,
        data_type VARCHAR(50),
        content JSONB,
        position_x INTEGER,
        position_y INTEGER,
        display_order INTEGER,
        is_active BOOLEAN DEFAULT true,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        subject VARCHAR(255),
        message TEXT NOT NULL,
        inquiry_type VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Database tables initialized successfully');
  } catch (err) {
    console.error('Database initialization error:', err);
  }
}

// API Routes for Planetary Cycles
app.get('/api/planetary-cycles', async (req, res) => {
  try {
    const { planet, cycle_type, active_only } = req.query;
    let query = 'SELECT * FROM planetary_cycles WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (planet) {
      paramCount++;
      query += ` AND planet = $${paramCount}`;
      params.push(planet);
    }

    if (cycle_type) {
      paramCount++;
      query += ` AND cycle_type = $${paramCount}`;
      params.push(cycle_type);
    }

    if (active_only === 'true') {
      query += ` AND (end_date IS NULL OR end_date >= CURRENT_DATE)`;
    }

    query += ' ORDER BY start_date DESC';

    const result = await pool.query(query, params);
    res.json({ cycles: result.rows, count: result.rows.length });
  } catch (err) {
    console.error('Error fetching planetary cycles:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/planetary-cycles', async (req, res) => {
  try {
    const {
      planet, cycle_type, start_date, end_date, current_phase,
      astro_sign, tarot_card, energy_type, influence_description, notes
    } = req.body;

    const result = await pool.query(`
      INSERT INTO planetary_cycles 
      (planet, cycle_type, start_date, end_date, current_phase, astro_sign, 
       tarot_card, energy_type, influence_description, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [planet, cycle_type, start_date, end_date, current_phase, astro_sign,
        tarot_card, energy_type, influence_description, notes]);

    res.status(201).json({ 
      cycle: result.rows[0], 
      message: '[IGM-GOVERNED] Planetary cycle created successfully' 
    });
  } catch (err) {
    console.error('Error creating planetary cycle:', err);
    res.status(500).json({ error: 'Failed to create planetary cycle' });
  }
});

app.put('/api/planetary-cycles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      planet, cycle_type, start_date, end_date, current_phase,
      astro_sign, tarot_card, energy_type, influence_description, notes
    } = req.body;

    const result = await pool.query(`
      UPDATE planetary_cycles 
      SET planet = $1, cycle_type = $2, start_date = $3, end_date = $4,
          current_phase = $5, astro_sign = $6, tarot_card = $7, 
          energy_type = $8, influence_description = $9, notes = $10,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING *
    `, [planet, cycle_type, start_date, end_date, current_phase, astro_sign,
        tarot_card, energy_type, influence_description, notes, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Planetary cycle not found' });
    }

    res.json({ 
      cycle: result.rows[0], 
      message: '[IGM-GOVERNED] Planetary cycle updated successfully' 
    });
  } catch (err) {
    console.error('Error updating planetary cycle:', err);
    res.status(500).json({ error: 'Failed to update planetary cycle' });
  }
});

app.delete('/api/planetary-cycles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM planetary_cycles WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Planetary cycle not found' });
    }

    res.json({ 
      message: '[IGM-GOVERNED] Planetary cycle deleted successfully',
      deleted_cycle: result.rows[0]
    });
  } catch (err) {
    console.error('Error deleting planetary cycle:', err);
    res.status(500).json({ error: 'Failed to delete planetary cycle' });
  }
});

// API Routes for Tarot Associations
app.get('/api/tarot-associations', async (req, res) => {
  try {
    const { planetary_ruler, card_type, element } = req.query;
    let query = 'SELECT * FROM tarot_associations WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (planetary_ruler) {
      paramCount++;
      query += ` AND planetary_ruler = $${paramCount}`;
      params.push(planetary_ruler);
    }

    if (card_type) {
      paramCount++;
      query += ` AND card_type = $${paramCount}`;
      params.push(card_type);
    }

    if (element) {
      paramCount++;
      query += ` AND element = $${paramCount}`;
      params.push(element);
    }

    query += ' ORDER BY card_name';

    const result = await pool.query(query, params);
    res.json({ associations: result.rows, count: result.rows.length });
  } catch (err) {
    console.error('Error fetching tarot associations:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/tarot-associations', async (req, res) => {
  try {
    const {
      card_name, card_type, planetary_ruler, astrological_sign,
      element, cycle_influence, energy_keywords, notes
    } = req.body;

    const result = await pool.query(`
      INSERT INTO tarot_associations 
      (card_name, card_type, planetary_ruler, astrological_sign, 
       element, cycle_influence, energy_keywords, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [card_name, card_type, planetary_ruler, astrological_sign,
        element, cycle_influence, energy_keywords, notes]);

    res.status(201).json({ 
      association: result.rows[0], 
      message: '[IGM-GOVERNED] Tarot association created successfully' 
    });
  } catch (err) {
    console.error('Error creating tarot association:', err);
    res.status(500).json({ error: 'Failed to create tarot association' });
  }
});

// API Routes for Astrological Aspects
app.get('/api/astrological-aspects', async (req, res) => {
  try {
    const { planet_one, planet_two, aspect_type, active_only } = req.query;
    let query = 'SELECT * FROM astrological_aspects WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (planet_one) {
      paramCount++;
      query += ` AND planet_one = $${paramCount}`;
      params.push(planet_one);
    }

    if (planet_two) {
      paramCount++;
      query += ` AND planet_two = $${paramCount}`;
      params.push(planet_two);
    }

    if (aspect_type) {
      paramCount++;
      query += ` AND aspect_type = $${paramCount}`;
      params.push(aspect_type);
    }

    if (active_only === 'true') {
      query += ` AND (end_date IS NULL OR end_date >= CURRENT_TIMESTAMP)`;
    }

    query += ' ORDER BY peak_date DESC';

    const result = await pool.query(query, params);
    res.json({ aspects: result.rows, count: result.rows.length });
  } catch (err) {
    console.error('Error fetching astrological aspects:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/astrological-aspects', async (req, res) => {
  try {
    const {
      aspect_name, planet_one, planet_two, aspect_type, degree_separation,
      start_date, peak_date, end_date, influence_level, description,
      tarot_guidance, notes
    } = req.body;

    const result = await pool.query(`
      INSERT INTO astrological_aspects 
      (aspect_name, planet_one, planet_two, aspect_type, degree_separation,
       start_date, peak_date, end_date, influence_level, description,
       tarot_guidance, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [aspect_name, planet_one, planet_two, aspect_type, degree_separation,
        start_date, peak_date, end_date, influence_level, description,
        tarot_guidance, notes]);

    res.status(201).json({ 
      aspect: result.rows[0], 
      message: '[IGM-GOVERNED] Astrological aspect created successfully' 
    });
  } catch (err) {
    console.error('Error creating astrological aspect:', err);
    res.status(500).json({ error: 'Failed to create astrological aspect' });
  }
});

// API Routes for Infographic Data
app.get('/api/infographic-data', async (req, res) => {
  try {
    const { section_name, data_type, active_only } = req.query;
    let query = 'SELECT * FROM infographic_data WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (section_name) {
      paramCount++;
      query += ` AND section_name = $${paramCount}`;
      params.push(section_name);
    }

    if (data_type) {
      paramCount++;
      query += ` AND data_type = $${paramCount}`;
      params.push(data_type);
    }

    if (active_only === 'true') {
      query += ` AND is_active = true`;
    }

    query += ' ORDER BY display_order, created_at';

    const result = await pool.query(query, params);
    res.json({ infographic_data: result.rows, count: result.rows.length });
  } catch (err) {
    console.error('Error fetching infographic data:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/infographic-data', async (req, res) => {
  try {
    const {
      section_name, data_type, content, position_x, position_y,
      display_order, is_active, notes
    } = req.body;

    const result = await pool.query(`
      INSERT INTO infographic_data 
      (section_name, data_type, content, position_x, position_y,
       display_order, is_active, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [section_name, data_type, JSON.stringify(content), position_x, position_y,
        display_order, is_active, notes]);

    res.status(201).json({ 
      data: result.rows[0], 
      message: '[IGM-GOVERNED] Infographic data created successfully' 
    });
  } catch (err) {
    console.error('Error creating infographic data:', err);
    res.status(500).json({ error: 'Failed to create infographic data' });
  }
});

app.put('/api/infographic-data/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      section_name, data_type, content, position_x, position_y,
      display_order, is_active, notes
    } = req.body;

    const result = await pool.query(`
      UPDATE infographic_data 
      SET section_name = $1, data_type = $2, content = $3, position_x = $4,
          position_y = $5, display_order = $6, is_active = $7, notes = $8,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING *
    `, [section_name, data_type, JSON.stringify(content), position_x, position_y,
        display_order, is_active, notes, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Infographic data not found' });
    }

    res.json({ 
      data: result.rows[0], 
      message: '[IGM-GOVERNED] Infographic data updated successfully' 
    });
  } catch (err) {
    console.error('Error updating infographic data:', err);
    res.status(500).json({ error: 'Failed to update infographic data' });
  }
});

// Contact form endpoint
app.post('/api/contacts', async (req, res) => {
  try {
    const { name, email, subject, message, inquiry_type } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required' });
    }

    const result = await pool.query(`
      INSERT INTO contacts (name, email, subject, message, inquiry_type)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [name, email, subject, message, inquiry_type]);

    res.status(201).json({ 
      contact: result.rows[0],
      message: '[IGM-GOVERNED] Contact submitted successfully' 
    });
  } catch (err) {
    console.error('Error saving contact:', err);
    res.status(500).json({ error: 'Failed to submit contact form' });
  }
});

// Statistics endpoint
app.get('/api/stats', async (req, res) => {
  try {
    const [
      cyclesResult,
      tarotResult,
      aspectsResult,
      contactsResult,
      infographicResult,
      activeCyclesResult
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM planetary_cycles'),
      pool.query('SELECT COUNT(*) as count FROM tarot_associations'),
      pool.query('SELECT COUNT(*) as count FROM astrological_aspects'),
      pool.query('SELECT COUNT(*) as count FROM contacts'),
      pool.query('SELECT COUNT(*) as count FROM infographic_data'),
      pool.query('SELECT COUNT(*) as count FROM planetary_cycles WHERE end_date IS NULL OR end_date >= CURRENT_DATE')
    ]);

    const planetDistribution = await pool.query(`
      SELECT planet, COUNT(*) as count 
      FROM planetary_cycles 
      GROUP BY planet 
      ORDER BY count DESC
    `);

    const cycleTypeDistribution = await pool.query(`
      SELECT cycle_type, COUNT(*) as count 
      FROM planetary_cycles 
      GROUP BY cycle_type 
      ORDER BY count DESC
    `);

    const recentActivity = await pool.query(`
      SELECT 'cycle' as type, planet as name, created_at 
      FROM planetary_cycles 
      WHERE created_at >= NOW() - INTERVAL '30 days'
      UNION ALL
      SELECT 'aspect' as type, aspect_name as name, created_at 
      FROM astrological_aspects 
      WHERE created_at >= NOW() - INTERVAL '30 days