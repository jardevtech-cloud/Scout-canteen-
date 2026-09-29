import fs from 'fs';
import path from 'path';
import initSqlJs, { Database, SqlValue } from 'sql.js';
import bcrypt from 'bcryptjs';

let dbInstance: Database | null = null;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'scouts_canteen.sqlite');

export async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const SQL = await initSqlJs({
    locateFile: (file) => {
      return path.resolve(process.cwd(), 'node_modules/sql.js/dist', file);
    },
  });

  if (fs.existsSync(DB_FILE)) {
    const fileBuffer = fs.readFileSync(DB_FILE);
    dbInstance = new SQL.Database(fileBuffer);
  } else {
    dbInstance = new SQL.Database();
  }

  initSchema(dbInstance);
  saveDb();
  return dbInstance;
}

export function saveDb(): void {
  if (!dbInstance) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.error('Failed to save SQLite database to disk:', err);
  }
}

export function exportDbBuffer(): Buffer {
  if (!dbInstance) throw new Error('Database not initialized');
  return Buffer.from(dbInstance.export());
}

export async function importDbBuffer(buffer: Buffer): Promise<void> {
  const SQL = await initSqlJs({
    locateFile: (file) => {
      return path.resolve(process.cwd(), 'node_modules/sql.js/dist', file);
    },
  });
  if (dbInstance) {
    dbInstance.close();
  }
  dbInstance = new SQL.Database(buffer);
  saveDb();
}

export function queryAll<T = Record<string, any>>(sql: string, params: SqlValue[] = []): T[] {
  if (!dbInstance) throw new Error('Database not initialized');
  const stmt = dbInstance.prepare(sql);
  stmt.bind(params);
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}

export function queryOne<T = Record<string, any>>(sql: string, params: SqlValue[] = []): T | null {
  const rows = queryAll<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export function execute(sql: string, params: SqlValue[] = []): { lastInsertRowid: number; changes: number } {
  if (!dbInstance) throw new Error('Database not initialized');
  const stmt = dbInstance.prepare(sql);
  stmt.bind(params);
  stmt.step();
  stmt.free();

  const idRes = dbInstance.exec('SELECT last_insert_rowid() AS id, changes() AS chg');
  let lastInsertRowid = 0;
  let changes = 0;
  if (idRes.length > 0 && idRes[0].values.length > 0) {
    lastInsertRowid = Number(idRes[0].values[0][0]) || 0;
    changes = Number(idRes[0].values[0][1]) || 0;
  }
  saveDb();
  return { lastInsertRowid, changes };
}

export function runTransaction<T>(fn: () => T): T {
  if (!dbInstance) throw new Error('Database not initialized');
  dbInstance.run('BEGIN TRANSACTION;');
  try {
    const result = fn();
    dbInstance.run('COMMIT;');
    saveDb();
    return result;
  } catch (err) {
    dbInstance.run('ROLLBACK;');
    throw err;
  }
}

function initSchema(db: Database) {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'cashier')),
      phone TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      icon TEXT,
      is_default INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      barcode TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      cost_price REAL NOT NULL DEFAULT 0,
      selling_price REAL NOT NULL DEFAULT 0,
      stock_quantity INTEGER NOT NULL DEFAULT 0,
      min_stock_level INTEGER NOT NULL DEFAULT 5,
      supplier TEXT,
      unit TEXT DEFAULT 'pcs',
      image_url TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
    CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_number TEXT UNIQUE NOT NULL,
      cashier_id INTEGER,
      cashier_name TEXT NOT NULL,
      subtotal REAL NOT NULL,
      discount REAL DEFAULT 0,
      total REAL NOT NULL,
      payment_method TEXT NOT NULL,
      amount_paid REAL NOT NULL,
      change_amount REAL DEFAULT 0,
      payment_reference TEXT,
      notes TEXT,
      scout_name TEXT,
      scout_id TEXT,
      patrol TEXT,
      unit_section TEXT,
      school_group TEXT,
      status TEXT DEFAULT 'completed',
      shift_id INTEGER,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sales_receipt ON sales(receipt_number);
    CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
    CREATE INDEX IF NOT EXISTS idx_sales_cashier ON sales(cashier_name);

    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      barcode TEXT,
      quantity INTEGER NOT NULL,
      unit_cost REAL NOT NULL DEFAULT 0,
      unit_price REAL NOT NULL,
      discount REAL DEFAULT 0,
      subtotal REAL NOT NULL,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
    CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id);

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      payment_method TEXT NOT NULL,
      amount REAL NOT NULL,
      reference_number TEXT,
      cashier_id INTEGER,
      created_at TEXT NOT NULL,
      FOREIGN KEY (sale_id) REFERENCES sales(id)
    );

    CREATE TABLE IF NOT EXISTS inventory_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      change_qty INTEGER NOT NULL,
      previous_qty INTEGER NOT NULL,
      new_qty INTEGER NOT NULL,
      reason TEXT NOT NULL,
      reference_id TEXT,
      user_name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory_movements(product_id);
    CREATE INDEX IF NOT EXISTS idx_inventory_date ON inventory_movements(created_at);

    CREATE TABLE IF NOT EXISTS cashier_shifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cashier_id INTEGER NOT NULL,
      cashier_name TEXT NOT NULL,
      opening_cash REAL NOT NULL DEFAULT 0,
      cash_sales REAL NOT NULL DEFAULT 0,
      mtn_momo_sales REAL NOT NULL DEFAULT 0,
      airtel_money_sales REAL NOT NULL DEFAULT 0,
      card_sales REAL NOT NULL DEFAULT 0,
      other_sales REAL NOT NULL DEFAULT 0,
      total_sales REAL NOT NULL DEFAULT 0,
      expected_cash REAL NOT NULL DEFAULT 0,
      actual_cash REAL,
      difference REAL,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'closed')),
      opened_at TEXT NOT NULL,
      closed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS returns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_number TEXT NOT NULL,
      sale_id INTEGER NOT NULL,
      original_total REAL NOT NULL,
      refund_amount REAL NOT NULL,
      reason TEXT NOT NULL,
      cashier_name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS return_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      return_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      refund_subtotal REAL NOT NULL,
      restocked INTEGER DEFAULT 1,
      FOREIGN KEY (return_id) REFERENCES returns(id)
    );

    CREATE TABLE IF NOT EXISTS scout_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_number TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      patrol TEXT,
      unit_section TEXT,
      group_name TEXT,
      contact TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      user_name TEXT NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id TEXT,
      description TEXT NOT NULL,
      details TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

    CREATE TABLE IF NOT EXISTS held_sales (
      id TEXT PRIMARY KEY,
      reference_name TEXT NOT NULL,
      cashier_name TEXT NOT NULL,
      cart_data TEXT NOT NULL,
      total_amount REAL NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      username TEXT NOT NULL,
      role TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  seedInitialData(db);
}

function seedInitialData(db: Database) {
  // Check if admin user exists
  const userCheck = db.exec('SELECT COUNT(*) FROM users');
  const userCount = userCheck.length > 0 && userCheck[0].values.length > 0 ? Number(userCheck[0].values[0][0]) : 0;

  if (userCount === 0) {
    const adminPassHash = bcrypt.hashSync('scouts2026', 10);
    const cashierPassHash = bcrypt.hashSync('scouts123', 10);
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO users (username, password_hash, full_name, role, phone, is_active, created_at) VALUES 
       ('admin', '${adminPassHash}', 'Scoutmaster Administrator', 'admin', '+256 700 111 222', 1, '${now}'),
       ('cashier', '${cashierPassHash}', 'Canteen Cashier 1', 'cashier', '+256 770 333 444', 1, '${now}');`
    );

    // Initial default settings
    const defaultSettings: Record<string, string> = {
      canteen_name: 'UGANDA SCOUTS CANTEEN',
      canteen_address: 'Baden Powell House, Buganda Road, Kampala, Uganda',
      telephone: '+256 414 258 584 / +256 772 450 120',
      email: 'canteen@ugandascouts.org',
      currency: 'UGX',
      currency_symbol: 'UGX',
      receipt_width: '80mm', // 80mm or 58mm
      receipt_header: 'NATIONAL TRAINING & ACTIVITY CANTEEN',
      receipt_footer: 'Be Prepared! Thank you for supporting the Scouts.',
      allow_negative_inventory: '0',
      low_stock_threshold: '5',
      tin_number: '1004892019',
      tax_rate: '0', // Canteen exempt/zero-rated by default
    };

    for (const [key, value] of Object.entries(defaultSettings)) {
      db.run(`INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('${key}', '${value.replace(/'/g, "''")}', '${now}');`);
    }

    // Default Categories
    const categories = [
      ['Drinks', 'Bottled soft drinks, energy drinks, cold beverages', 'cup-soda'],
      ['Water', 'Pure mineral water, chilled and room temperature', 'droplets'],
      ['Snacks', 'Crisps, mandazi, samosas, biscuits, groundnuts', 'cookie'],
      ['Food', 'Hot meals, sandwiches, chapatis, rolex', 'utensils'],
      ['Stationery', 'Exercise books, pens, pencils, rulers, markers', 'book-open'],
      ['Scout Uniforms', 'Official scout shirts, shorts, trousers, scarves, hats', 'shirt'],
      ['Scout Badges', 'Investiture badges, proficiency badges, patrol flashes', 'award'],
      ['Scout Equipment', 'Whistles, compasses, toggles, scout belts, lanyards', 'compass'],
      ['Camping Equipment', 'Tents, mess tins, groundsheets, water canteens, ropes', 'tent'],
      ['Books', 'Scouting for Boys, patrol handbooks, leader guides', 'book'],
      ['Personal Care', 'Hand sanitizer, soap, insect repellent, sunscreen', 'sparkles'],
      ['Other', 'Souvenirs, stickers, keyrings, miscellaneous', 'tag'],
    ];

    for (const [name, desc, icon] of categories) {
      db.run(
        `INSERT OR IGNORE INTO categories (name, description, icon, is_default, created_at) 
         VALUES ('${name.replace(/'/g, "''")}', '${desc.replace(/'/g, "''")}', '${icon}', 1, '${now}');`
      );
    }

    // Initial Realistic Products for Uganda Scouts Canteen
    const products = [
      {
        barcode: '6001001',
        name: 'Rwenzori Mineral Water 500ml',
        category: 'Water',
        cost_price: 800,
        selling_price: 1500,
        stock_quantity: 120,
        min_stock: 24,
        unit: 'bottle',
        supplier: 'Rwenzori Beverages',
        desc: 'Chilled natural mineral water 500ml bottle',
      },
      {
        barcode: '6001002',
        name: 'Highland Pure Water 1.5L',
        category: 'Water',
        cost_price: 1500,
        selling_price: 2500,
        stock_quantity: 60,
        min_stock: 12,
        unit: 'bottle',
        supplier: 'Highland Mineral Waters Ltd',
        desc: 'Family/Scout hiking 1.5L water bottle',
      },
      {
        barcode: '6001003',
        name: 'Coca-Cola 300ml Glass Bottle',
        category: 'Drinks',
        cost_price: 1200,
        selling_price: 2000,
        stock_quantity: 72,
        min_stock: 24,
        unit: 'bottle',
        supplier: 'Century Bottling Co',
        desc: 'Classic cold Coca-Cola soda',
      },
      {
        barcode: '6001004',
        name: 'Fanta Orange 300ml',
        category: 'Drinks',
        cost_price: 1200,
        selling_price: 2000,
        stock_quantity: 48,
        min_stock: 12,
        unit: 'bottle',
        supplier: 'Century Bottling Co',
        desc: 'Fanta Orange sparkling soda',
      },
      {
        barcode: '6001005',
        name: 'Minute Maid Mango 400ml',
        category: 'Drinks',
        cost_price: 2000,
        selling_price: 3000,
        stock_quantity: 40,
        min_stock: 10,
        unit: 'bottle',
        supplier: 'Century Bottling Co',
        desc: 'Refreshing mango fruit juice blend',
      },
      {
        barcode: '6001006',
        name: 'Sumz Salted Potato Crisps 50g',
        category: 'Snacks',
        cost_price: 1200,
        selling_price: 2000,
        stock_quantity: 85,
        min_stock: 15,
        unit: 'pack',
        supplier: 'Sumz Snacks Uganda',
        desc: 'Crispy lightly salted potato crisps',
      },
      {
        barcode: '6001007',
        name: 'Gorillos Chilli Maize Puffs',
        category: 'Snacks',
        cost_price: 600,
        selling_price: 1000,
        stock_quantity: 90,
        min_stock: 20,
        unit: 'pack',
        supplier: 'Britania Allied Industries',
        desc: 'Spicy puffed corn snack',
      },
      {
        barcode: '6001008',
        name: 'Fresh Chapati (Double Layer)',
        category: 'Food',
        cost_price: 600,
        selling_price: 1000,
        stock_quantity: 50,
        min_stock: 10,
        unit: 'pcs',
        supplier: 'Canteen Kitchen',
        desc: 'Hot golden wheat chapati',
      },
      {
        barcode: '6001009',
        name: 'Classic Rolex (Chapati + 2 Eggs)',
        category: 'Food',
        cost_price: 2000,
        selling_price: 3500,
        stock_quantity: 35,
        min_stock: 5,
        unit: 'pcs',
        supplier: 'Canteen Kitchen',
        desc: 'Rolled eggs in chapati with cabbage & tomatoes',
      },
      {
        barcode: '6001010',
        name: 'Picfare 96-Page Exercise Book',
        category: 'Stationery',
        cost_price: 1000,
        selling_price: 1800,
        stock_quantity: 150,
        min_stock: 30,
        unit: 'pcs',
        supplier: 'Picfare Industries',
        desc: 'Ruled scout camp log & exercise book',
      },
      {
        barcode: '6001011',
        name: 'Bic Ballpoint Pen (Blue)',
        category: 'Stationery',
        cost_price: 500,
        selling_price: 1000,
        stock_quantity: 200,
        min_stock: 40,
        unit: 'pcs',
        supplier: 'Stationery World',
        desc: 'Smooth writing medium ballpoint pen',
      },
      {
        barcode: '6001012',
        name: 'Official Uganda Scout Neckerchief (Scarf)',
        category: 'Scout Uniforms',
        cost_price: 7000,
        selling_price: 12000,
        stock_quantity: 45,
        min_stock: 10,
        unit: 'pcs',
        supplier: 'Uganda Scouts HQ Supplies',
        desc: 'National black-yellow-red trimmed scout scarf',
      },
      {
        barcode: '6001013',
        name: 'Leather Scout Woggle / Ring',
        category: 'Scout Equipment',
        cost_price: 2500,
        selling_price: 5000,
        stock_quantity: 65,
        min_stock: 15,
        unit: 'pcs',
        supplier: 'Uganda Scouts Crafts',
        desc: 'Hand-braided leather woggle for scout scarf',
      },
      {
        barcode: '6001014',
        name: 'Official Scout Khaki Shirt (Short Sleeve)',
        category: 'Scout Uniforms',
        cost_price: 22000,
        selling_price: 35000,
        stock_quantity: 28,
        min_stock: 8,
        unit: 'pcs',
        supplier: 'Uganda Scouts HQ Supplies',
        desc: 'Durable cotton-twill uniform shirt with epaulettes',
      },
      {
        barcode: '6001015',
        name: 'Scout Leather Belt with Brass Buckle',
        category: 'Scout Uniforms',
        cost_price: 10000,
        selling_price: 18000,
        stock_quantity: 32,
        min_stock: 10,
        unit: 'pcs',
        supplier: 'Uganda Scouts HQ Supplies',
        desc: 'Embossed leather belt with fleur-de-lis scout buckle',
      },
      {
        barcode: '6001016',
        name: 'Scout Beret (Forest Green)',
        category: 'Scout Uniforms',
        cost_price: 9000,
        selling_price: 15000,
        stock_quantity: 30,
        min_stock: 6,
        unit: 'pcs',
        supplier: 'Uganda Scouts HQ Supplies',
        desc: 'Woollen green beret with badge mounting pad',
      },
      {
        barcode: '6001017',
        name: 'Uganda Scouts Investiture Badge (Cloth)',
        category: 'Scout Badges',
        cost_price: 1500,
        selling_price: 3000,
        stock_quantity: 110,
        min_stock: 25,
        unit: 'pcs',
        supplier: 'Uganda Scouts HQ Supplies',
        desc: 'Embroidered official investiture membership badge',
      },
      {
        barcode: '6001018',
        name: 'Patrol Leader / Assistant PL Strips',
        category: 'Scout Badges',
        cost_price: 1000,
        selling_price: 2500,
        stock_quantity: 75,
        min_stock: 20,
        unit: 'pair',
        supplier: 'Uganda Scouts HQ Supplies',
        desc: 'White felt leadership stripes for shirt pocket',
      },
      {
        barcode: '6001019',
        name: 'First Aid Proficiency Cloth Badge',
        category: 'Scout Badges',
        cost_price: 2000,
        selling_price: 4000,
        stock_quantity: 55,
        min_stock: 15,
        unit: 'pcs',
        supplier: 'Uganda Scouts HQ Supplies',
        desc: 'Green & red embroidered First Aid proficiency award',
      },
      {
        barcode: '6001020',
        name: 'Metal Scout Whistle with Lanyard',
        category: 'Scout Equipment',
        cost_price: 4500,
        selling_price: 8000,
        stock_quantity: 42,
        min_stock: 10,
        unit: 'pcs',
        supplier: 'CampMaster Equip',
        desc: 'High-pitch nickel plated command whistle with braided cord',
      },
      {
        barcode: '6001021',
        name: 'Silva Orienteering Compass',
        category: 'Scout Equipment',
        cost_price: 14000,
        selling_price: 25000,
        stock_quantity: 22,
        min_stock: 5,
        unit: 'pcs',
        supplier: 'Outdoor Gears EA',
        desc: 'Liquid filled clear baseplate map reading compass',
      },
      {
        barcode: '6001022',
        name: 'Scout Stainless Steel Mess Tin (2-Piece)',
        category: 'Camping Equipment',
        cost_price: 12000,
        selling_price: 22000,
        stock_quantity: 18,
        min_stock: 5,
        unit: 'set',
        supplier: 'Outdoor Gears EA',
        desc: 'Nesting cooking and eating mess kit with folding handles',
      },
      {
        barcode: '6001023',
        name: 'Nylon Camp Groundsheet (2m x 2m)',
        category: 'Camping Equipment',
        cost_price: 15000,
        selling_price: 28000,
        stock_quantity: 14,
        min_stock: 4,
        unit: 'pcs',
        supplier: 'CampMaster Equip',
        desc: 'Waterproof reinforced eyelet groundsheet for tents',
      },
      {
        barcode: '6001024',
        name: 'Scouting for Boys (Centenary Edition)',
        category: 'Books',
        cost_price: 18000,
        selling_price: 30000,
        stock_quantity: 15,
        min_stock: 5,
        unit: 'pcs',
        supplier: 'Uganda Scouts HQ Library',
        desc: 'Lord Baden-Powell classic manual for scoutcraft and character',
      },
    ];

    for (const p of products) {
      db.run(
        `INSERT INTO products (barcode, name, category, description, cost_price, selling_price, stock_quantity, min_stock_level, supplier, unit, is_active, created_at, updated_at)
         VALUES ('${p.barcode}', '${p.name.replace(/'/g, "''")}', '${p.category}', '${p.desc.replace(/'/g, "''")}', ${p.cost_price}, ${p.selling_price}, ${p.stock_quantity}, ${p.min_stock}, '${p.supplier.replace(/'/g, "''")}', '${p.unit}', 1, '${now}', '${now}');`
      );

      // Record initial inventory movement
      db.run(
        `INSERT INTO inventory_movements (product_id, product_name, change_qty, previous_qty, new_qty, reason, reference_id, user_name, created_at)
         VALUES ((SELECT id FROM products WHERE barcode = '${p.barcode}'), '${p.name.replace(/'/g, "''")}', ${p.stock_quantity}, 0, ${p.stock_quantity}, 'Initial Stock Setup', 'INIT-SETUP', 'admin', '${now}');`
      );
    }

    // Seed sample Scout Members for patrol attribution
    const scouts = [
      ['UG-SC-101', 'Kiiza Joshua', 'Eagle', 'Scouts', '1st Kampala Troop', '+256 701 445 566'],
      ['UG-SC-102', 'Nakato Grace', 'Lion', 'Scouts', 'Mengo Senior School Troop', '+256 772 889 900'],
      ['UG-SC-103', 'Mugisha Brian', 'Buffalo', 'Ventures', 'Makerere College Troop', '+256 754 112 233'],
      ['UG-SC-104', 'Akello Sarah', 'Cobra', 'Cubs', 'St. Jude Primary Troop', '+256 788 334 455'],
      ['UG-SC-105', 'Kato Emmanuel', 'Falcon', 'Rovers', 'Uganda Christian University Crew', '+256 702 778 899'],
    ];

    for (const [num, name, patrol, section, group, contact] of scouts) {
      db.run(
        `INSERT INTO scout_members (member_number, full_name, patrol, unit_section, group_name, contact, created_at)
         VALUES ('${num}', '${name.replace(/'/g, "''")}', '${patrol}', '${section}', '${group.replace(/'/g, "''")}', '${contact}', '${now}');`
      );
    }

    // Seed audit log
    db.run(
      `INSERT INTO audit_logs (user_name, action, target_type, description, created_at)
       VALUES ('SYSTEM', 'INITIAL_DATABASE_SEED', 'SYSTEM', 'Seeded initial products, categories, default admin & cashier accounts, and Scout members', '${now}');`
    );
  }
}
