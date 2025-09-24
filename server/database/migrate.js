require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('./connection');

async function runMigrations() {
  try {
    console.log('Starting database migration...');
    
    // Read the schema file
    const schemaPath = path.join(__dirname, 'schema_fixed.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split the schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`Executing statement ${i + 1}/${statements.length}...`);
          await db.query(statement);
        } catch (err) {
          // Skip CREATE DATABASE and \c commands as they can't be executed via connection
          if (statement.includes('CREATE DATABASE') || statement.includes('\\c')) {
            console.log(`Skipping: ${statement.substring(0, 50)}...`);
            continue;
          }
          throw err;
        }
      }
    }
    
    console.log('Database migration completed successfully!');
    
    // Create initial admin user
    await createInitialAdmin();
    
    // Create some default categories
    await createDefaultCategories();
    
    // Create some default tags
    await createDefaultTags();
    
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await db.disconnect();
  }
}

async function createInitialAdmin() {
  try {
    const bcrypt = require('bcryptjs');
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@techblog.com';
    
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    
    const result = await db.query(`
      INSERT INTO users (username, email, password_hash, full_name, is_admin, is_verified)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO NOTHING
      RETURNING id
    `, ['admin', adminEmail, passwordHash, 'Site Administrator', true, true]);
    
    if (result.rows.length > 0) {
      console.log('Initial admin user created successfully');
      console.log(`Admin credentials: ${adminEmail} / ${adminPassword}`);
    } else {
      console.log('Admin user already exists');
    }
  } catch (err) {
    console.error('Failed to create admin user:', err);
  }
}

async function createDefaultCategories() {
  try {
    const categories = [
      { name: 'Programming', slug: 'programming', description: 'Software development and coding topics' },
      { name: 'Web Development', slug: 'web-development', description: 'Frontend and backend web technologies' },
      { name: 'Data Science', slug: 'data-science', description: 'Machine learning, AI, and data analysis' },
      { name: 'DevOps', slug: 'devops', description: 'Infrastructure, deployment, and operations' },
      { name: 'Mobile Development', slug: 'mobile-development', description: 'iOS, Android, and mobile apps' },
      { name: 'Cybersecurity', slug: 'cybersecurity', description: 'Security, privacy, and ethical hacking' },
      { name: 'Cloud Computing', slug: 'cloud-computing', description: 'AWS, Azure, Google Cloud, and more' },
      { name: 'Open Source', slug: 'open-source', description: 'Open source projects and contributions' }
    ];
    
    for (const category of categories) {
      await db.query(`
        INSERT INTO categories (name, slug, description)
        VALUES ($1, $2, $3)
        ON CONFLICT (slug) DO NOTHING
      `, [category.name, category.slug, category.description]);
    }
    
    console.log('Default categories created successfully');
  } catch (err) {
    console.error('Failed to create default categories:', err);
  }
}

async function createDefaultTags() {
  try {
    const tags = [
      { name: 'JavaScript', color: '#F7DF1E' },
      { name: 'Python', color: '#3776AB' },
      { name: 'React', color: '#61DAFB' },
      { name: 'Node.js', color: '#339933' },
      { name: 'TypeScript', color: '#3178C6' },
      { name: 'Docker', color: '#2496ED' },
      { name: 'AWS', color: '#FF9900' },
      { name: 'Git', color: '#F05032' },
      { name: 'SQL', color: '#E48E00' },
      { name: 'API', color: '#FF6B6B' },
      { name: 'Testing', color: '#28A745' },
      { name: 'Performance', color: '#FFC107' },
      { name: 'Security', color: '#DC3545' },
      { name: 'Tutorial', color: '#17A2B8' },
      { name: 'Best Practices', color: '#6F42C1' }
    ];
    
    for (const tag of tags) {
      await db.query(`
        INSERT INTO tags (name, color)
        VALUES ($1, $2)
        ON CONFLICT (name) DO NOTHING
      `, [tag.name, tag.color]);
    }
    
    console.log('Default tags created successfully');
  } catch (err) {
    console.error('Failed to create default tags:', err);
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };


