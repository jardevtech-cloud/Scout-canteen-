import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import {
  getDb,
  queryAll,
  queryOne,
  execute,
  runTransaction,
  exportDbBuffer,
  importDbBuffer,
  saveDb,
} from './db.js';

export const apiRouter = Router();

// Middleware: Authenticate Session Token
interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    username: string;
    full_name: string;
    role: 'admin' | 'cashier';
  };
}

const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const token = (req.headers['x-auth-token'] as string) || (req.headers.authorization?.replace('Bearer ', ''));
  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  const session = queryOne<{
    token: string;
    user_id: number;
    username: string;
    role: 'admin' | 'cashier';
    expires_at: number;
  }>('SELECT * FROM sessions WHERE token = ?', [token]);

  if (!session || session.expires_at < Date.now()) {
    if (session) {
      execute('DELETE FROM sessions WHERE token = ?', [token]);
    }
    return res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
  }

  const user = queryOne<{ id: number; username: string; full_name: string; role: 'admin' | 'cashier'; is_active: number }>(
    'SELECT id, username, full_name, role, is_active FROM users WHERE id = ?',
    [session.user_id]
  );

  if (!user || user.is_active !== 1) {
    return res.status(403).json({ error: 'User account is deactivated.' });
  }

  req.user = {
    id: user.id,
    username: user.username,
    full_name: user.full_name,
    role: user.role,
  };
  next();
};

const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Unauthorized: Admin privileges required.' });
  }
  next();
};

function logAudit(userName: string, action: string, targetType: string, targetId: string | null, description: string, details?: any) {
  try {
    const now = new Date().toISOString();
    const detailsStr = details ? JSON.stringify(details) : null;
    execute(
      `INSERT INTO audit_logs (user_name, action, target_type, target_id, description, details, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userName, action, targetType, targetId, description, detailsStr, now]
    );
  } catch (err) {
    console.error('Audit log error:', err);
  }
}

// -----------------------------------------------------------------------------
// AUTH ROUTES
// -----------------------------------------------------------------------------
apiRouter.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const user = queryOne<{
      id: number;
      username: string;
      password_hash: string;
      full_name: string;
      role: 'admin' | 'cashier';
      phone: string;
      is_active: number;
    }>('SELECT * FROM users WHERE username = ?', [username.trim().toLowerCase()]);

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    if (user.is_active !== 1) {
      return res.status(403).json({ error: 'This user account is inactive. Please contact your Scoutmaster.' });
    }

    const isValid = bcrypt.compareSync(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
    const now = new Date().toISOString();

    execute(
      `INSERT INTO sessions (token, user_id, username, role, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [token, user.id, user.username, user.role, expiresAt, now]
    );

    logAudit(user.username, 'USER_LOGIN', 'USER', String(user.id), `User ${user.username} (${user.role}) logged in`);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        phone: user.phone,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Login failed.' });
  }
});

apiRouter.get('/auth/me', authenticate, (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user });
});

apiRouter.post('/auth/logout', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const token = (req.headers['x-auth-token'] as string) || (req.headers.authorization?.replace('Bearer ', ''));
  if (token) {
    execute('DELETE FROM sessions WHERE token = ?', [token]);
  }
  if (req.user) {
    logAudit(req.user.username, 'USER_LOGOUT', 'USER', String(req.user.id), `User ${req.user.username} logged out`);
  }
  res.json({ success: true, message: 'Logged out successfully.' });
});

apiRouter.get('/auth/users', authenticate, requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  const users = queryAll(
    'SELECT id, username, full_name, role, phone, is_active, created_at FROM users ORDER BY id ASC'
  );
  res.json({ users });
});

apiRouter.post('/auth/users', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { username, password, full_name, role, phone } = req.body;
    if (!username || !password || !full_name || !role) {
      return res.status(400).json({ error: 'Username, password, full name, and role are required.' });
    }

    const cleanUser = username.trim().toLowerCase();
    const existing = queryOne('SELECT id FROM users WHERE username = ?', [cleanUser]);
    if (existing) {
      return res.status(400).json({ error: `Username "${cleanUser}" already exists.` });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const now = new Date().toISOString();

    const result = execute(
      `INSERT INTO users (username, password_hash, full_name, role, phone, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, 1, ?)`,
      [cleanUser, passwordHash, full_name.trim(), role, phone || '', now]
    );

    logAudit(req.user!.username, 'USER_CREATE', 'USER', String(result.lastInsertRowid), `Created user ${cleanUser} (${role})`);
    res.json({ success: true, id: result.lastInsertRowid, message: 'User created successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create user.' });
  }
});

apiRouter.put('/auth/users/:id', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { full_name, role, phone, is_active, new_password } = req.body;

    const user = queryOne<{ id: number; username: string }>('SELECT * FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (new_password && new_password.trim().length > 0) {
      const hash = bcrypt.hashSync(new_password.trim(), 10);
      execute('UPDATE users SET password_hash = ? WHERE id = ?', [hash, id]);
    }

    execute(
      `UPDATE users SET full_name = ?, role = ?, phone = ?, is_active = ? WHERE id = ?`,
      [full_name, role, phone || '', is_active ? 1 : 0, id]
    );

    logAudit(req.user!.username, 'USER_UPDATE', 'USER', String(id), `Updated user ${user.username}`);
    res.json({ success: true, message: 'User updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update user.' });
  }
});

// -----------------------------------------------------------------------------
// PRODUCTS ROUTES
// -----------------------------------------------------------------------------
apiRouter.get('/products', authenticate, (req: Request, res: Response) => {
  try {
    const search = ((req.query.search as string) || '').trim();
    const category = (req.query.category as string) || '';
    const stockStatus = (req.query.stockStatus as string) || 'all'; // all, low, out
    const activeOnly = req.query.active !== 'false';

    let sql = 'SELECT * FROM products WHERE 1=1';
    const params: (string | number)[] = [];

    if (activeOnly) {
      sql += ' AND is_active = 1';
    }

    if (category && category !== 'All') {
      sql += ' AND category = ?';
      params.push(category);
    }

    if (search) {
      sql += ' AND (name LIKE ? OR barcode LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (stockStatus === 'low') {
      sql += ' AND stock_quantity <= min_stock_level AND stock_quantity > 0';
    } else if (stockStatus === 'out') {
      sql += ' AND stock_quantity <= 0';
    }

    sql += ' ORDER BY name ASC';
    const products = queryAll(sql, params);
    res.json({ products });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load products.' });
  }
});

apiRouter.get('/products/barcode/:barcode', authenticate, (req: Request, res: Response) => {
  try {
    const barcode = req.params.barcode.trim();
    const product = queryOne('SELECT * FROM products WHERE barcode = ? AND is_active = 1', [barcode]);
    if (!product) {
      return res.status(404).json({ error: 'Product not found', barcode });
    }
    res.json({ product });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error looking up barcode.' });
  }
});

apiRouter.get('/products/:id', authenticate, (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const product = queryOne('SELECT * FROM products WHERE id = ?', [id]);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ product });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/products', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      barcode,
      name,
      category,
      description,
      cost_price,
      selling_price,
      stock_quantity,
      min_stock_level,
      supplier,
      unit,
      image_url,
    } = req.body;

    if (!barcode || !name || !category || selling_price === undefined) {
      return res.status(400).json({ error: 'Barcode, Name, Category, and Selling Price are required.' });
    }

    const cleanBarcode = String(barcode).trim();
    const existing = queryOne('SELECT id FROM products WHERE barcode = ?', [cleanBarcode]);
    if (existing) {
      return res.status(400).json({ error: `Product with barcode "${cleanBarcode}" already exists.` });
    }

    const now = new Date().toISOString();
    const initialQty = Number(stock_quantity) || 0;

    const result = execute(
      `INSERT INTO products (barcode, name, category, description, cost_price, selling_price, stock_quantity, min_stock_level, supplier, unit, image_url, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        cleanBarcode,
        String(name).trim(),
        String(category).trim(),
        description || '',
        Number(cost_price) || 0,
        Number(selling_price) || 0,
        initialQty,
        Number(min_stock_level) || 5,
        supplier || '',
        unit || 'pcs',
        image_url || '',
        now,
        now,
      ]
    );

    const newProductId = result.lastInsertRowid;

    if (initialQty > 0) {
      execute(
        `INSERT INTO inventory_movements (product_id, product_name, change_qty, previous_qty, new_qty, reason, reference_id, user_name, created_at)
         VALUES (?, ?, ?, 0, ?, 'Initial Stock Entry', 'NEW-PRODUCT', ?, ?)`,
        [newProductId, name, initialQty, initialQty, req.user!.username, now]
      );
    }

    logAudit(
      req.user!.username,
      'PRODUCT_CREATE',
      'PRODUCT',
      String(newProductId),
      `Created product "${name}" (Barcode: ${cleanBarcode}) with stock ${initialQty}`,
      { cost_price, selling_price }
    );

    res.json({ success: true, id: newProductId, message: 'Product created successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create product.' });
  }
});

apiRouter.put('/products/:id', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const product = queryOne<{ id: number; name: string; barcode: string; selling_price: number; cost_price: number; stock_quantity: number }>(
      'SELECT * FROM products WHERE id = ?',
      [id]
    );
    if (!product) return res.status(404).json({ error: 'Product not found.' });

    const {
      barcode,
      name,
      category,
      description,
      cost_price,
      selling_price,
      min_stock_level,
      supplier,
      unit,
      image_url,
      is_active,
    } = req.body;

    const cleanBarcode = String(barcode).trim();
    const existing = queryOne('SELECT id FROM products WHERE barcode = ? AND id != ?', [cleanBarcode, id]);
    if (existing) {
      return res.status(400).json({ error: `Barcode "${cleanBarcode}" is already used by another product.` });
    }

    const now = new Date().toISOString();
    const newSellPrice = Number(selling_price);
    const newCostPrice = Number(cost_price);

    // Track price changes in audit log
    if (product.selling_price !== newSellPrice || product.cost_price !== newCostPrice) {
      logAudit(
        req.user!.username,
        'PRICE_CHANGE',
        'PRODUCT',
        String(id),
        `Price updated for "${name}". Sell: ${product.selling_price} -> ${newSellPrice}, Cost: ${product.cost_price} -> ${newCostPrice}`,
        { old_sell: product.selling_price, new_sell: newSellPrice, old_cost: product.cost_price, new_cost: newCostPrice }
      );
    }

    execute(
      `UPDATE products 
       SET barcode = ?, name = ?, category = ?, description = ?, cost_price = ?, selling_price = ?, min_stock_level = ?, supplier = ?, unit = ?, image_url = ?, is_active = ?, updated_at = ?
       WHERE id = ?`,
      [
        cleanBarcode,
        String(name).trim(),
        String(category).trim(),
        description || '',
        newCostPrice,
        newSellPrice,
        Number(min_stock_level) || 5,
        supplier || '',
        unit || 'pcs',
        image_url || '',
        is_active !== undefined ? (is_active ? 1 : 0) : 1,
        now,
        id,
      ]
    );

    logAudit(req.user!.username, 'PRODUCT_UPDATE', 'PRODUCT', String(id), `Updated product "${name}"`);
    res.json({ success: true, message: 'Product updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update product.' });
  }
});

apiRouter.delete('/products/:id', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const product = queryOne<{ id: number; name: string }>('SELECT * FROM products WHERE id = ?', [id]);
    if (!product) return res.status(404).json({ error: 'Product not found.' });

    // Check if product was used in sales; if so, soft-delete (deactivate) to protect history
    const salesCount = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM sale_items WHERE product_id = ?', [id]);
    if (salesCount && salesCount.count > 0) {
      execute('UPDATE products SET is_active = 0, updated_at = ? WHERE id = ?', [new Date().toISOString(), id]);
      logAudit(req.user!.username, 'PRODUCT_DEACTIVATE', 'PRODUCT', String(id), `Deactivated product "${product.name}" (retained for sales history)`);
      return res.json({ success: true, message: 'Product has historical sales, so it has been deactivated rather than deleted.' });
    }

    execute('DELETE FROM products WHERE id = ?', [id]);
    logAudit(req.user!.username, 'PRODUCT_DELETE', 'PRODUCT', String(id), `Deleted product "${product.name}"`);
    res.json({ success: true, message: 'Product deleted permanently.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete product.' });
  }
});

apiRouter.post('/products/import', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No items provided for import.' });
    }

    let imported = 0;
    let skipped = 0;
    const now = new Date().toISOString();

    runTransaction(() => {
      for (const item of items) {
        if (!item.name || !item.barcode) {
          skipped++;
          continue;
        }
        const barcode = String(item.barcode).trim();
        const existing = queryOne('SELECT id FROM products WHERE barcode = ?', [barcode]);
        if (existing) {
          skipped++;
          continue;
        }

        const qty = Number(item.stock_quantity) || 0;
        const res = execute(
          `INSERT INTO products (barcode, name, category, description, cost_price, selling_price, stock_quantity, min_stock_level, supplier, unit, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
          [
            barcode,
            String(item.name).trim(),
            item.category || 'Other',
            item.description || '',
            Number(item.cost_price) || 0,
            Number(item.selling_price) || 0,
            qty,
            Number(item.min_stock_level) || 5,
            item.supplier || '',
            item.unit || 'pcs',
            now,
            now,
          ]
        );

        if (qty > 0) {
          execute(
            `INSERT INTO inventory_movements (product_id, product_name, change_qty, previous_qty, new_qty, reason, reference_id, user_name, created_at)
             VALUES (?, ?, ?, 0, ?, 'Batch CSV Import', 'IMPORT', ?, ?)`,
            [res.lastInsertRowid, item.name, qty, qty, req.user!.username, now]
          );
        }
        imported++;
      }
    });

    logAudit(req.user!.username, 'PRODUCT_IMPORT', 'PRODUCT', null, `Imported ${imported} products (${skipped} skipped due to duplicates or invalid data)`);
    res.json({ success: true, imported, skipped });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Import failed.' });
  }
});

// -----------------------------------------------------------------------------
// CATEGORIES ROUTES
// -----------------------------------------------------------------------------
apiRouter.get('/categories', authenticate, (_req: Request, res: Response) => {
  const categories = queryAll(`
    SELECT c.*, COUNT(p.id) as product_count 
    FROM categories c 
    LEFT JOIN products p ON p.category = c.name AND p.is_active = 1
    GROUP BY c.id 
    ORDER BY c.name ASC
  `);
  res.json({ categories });
});

apiRouter.post('/categories', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, description, icon } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Category name is required.' });

    const cleanName = name.trim();
    const existing = queryOne('SELECT id FROM categories WHERE name = ?', [cleanName]);
    if (existing) return res.status(400).json({ error: 'Category already exists.' });

    const now = new Date().toISOString();
    const result = execute(
      'INSERT INTO categories (name, description, icon, is_default, created_at) VALUES (?, ?, ?, 0, ?)',
      [cleanName, description || '', icon || 'tag', now]
    );

    logAudit(req.user!.username, 'CATEGORY_CREATE', 'CATEGORY', String(result.lastInsertRowid), `Created category "${cleanName}"`);
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/categories/:id', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const cat = queryOne<{ id: number; name: string }>('SELECT * FROM categories WHERE id = ?', [id]);
    if (!cat) return res.status(404).json({ error: 'Category not found.' });

    const productInCat = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM products WHERE category = ?', [cat.name]);
    if (productInCat && productInCat.count > 0) {
      return res.status(400).json({ error: `Cannot delete "${cat.name}" because ${productInCat.count} products are assigned to it.` });
    }

    execute('DELETE FROM categories WHERE id = ?', [id]);
    logAudit(req.user!.username, 'CATEGORY_DELETE', 'CATEGORY', String(id), `Deleted category "${cat.name}"`);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------------------------------------------
// POS SALES / CHECKOUT (ATOMIC TRANSACTION & IDEMPOTENCY)
// -----------------------------------------------------------------------------
apiRouter.post('/sales', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      receipt_number: clientReceipt,
      items,
      subtotal,
      discount = 0,
      total,
      payment_method,
      amount_paid,
      change_amount = 0,
      payment_reference,
      notes,
      scout_name,
      scout_id,
      patrol,
      unit_section,
      school_group,
      shift_id,
      idempotency_key,
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Cannot complete sale: Cart is empty.' });
    }

    if (!payment_method || total === undefined) {
      return res.status(400).json({ error: 'Payment method and total amount are required.' });
    }

    // Check duplicate sale via idempotency_key if provided in payment_reference
    if (idempotency_key) {
      const dup = queryOne('SELECT id, receipt_number FROM sales WHERE notes LIKE ?', [`%[IDEM:${idempotency_key}]%`]);
      if (dup) {
        const fullSale = queryOne('SELECT * FROM sales WHERE id = ?', [dup.id]);
        return res.json({ success: true, sale: fullSale, duplicatePrevented: true });
      }
    }

    // Check negative inventory setting
    const allowNegativeSetting = queryOne<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['allow_negative_inventory']);
    const allowNegative = allowNegativeSetting?.value === '1';

    // Verify stock availability for all items before initiating transaction
    for (const item of items) {
      const p = queryOne<{ id: number; name: string; stock_quantity: number }>('SELECT id, name, stock_quantity FROM products WHERE id = ?', [item.product_id]);
      if (!p) {
        return res.status(400).json({ error: `Product ID #${item.product_id} not found in database.` });
      }
      if (!allowNegative && p.stock_quantity < item.quantity) {
        return res.status(400).json({
          error: `Insufficient stock for "${p.name}". Available: ${p.stock_quantity}, requested: ${item.quantity}.`,
        });
      }
    }

    // Generate unique receipt number: SC-YYYYMMDD-XXXX
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const receiptNumber = clientReceipt || `SC-${dateStr}-${randomSuffix}`;
    const timestamp = now.toISOString();

    const saleNotes = idempotency_key ? `${notes || ''} [IDEM:${idempotency_key}]`.trim() : (notes || '');

    // ATOMIC TRANSACTION:
    const saleResult = runTransaction(() => {
      // 1. Create Sale Header
      const saleInsert = execute(
        `INSERT INTO sales (
          receipt_number, cashier_id, cashier_name, subtotal, discount, total,
          payment_method, amount_paid, change_amount, payment_reference, notes,
          scout_name, scout_id, patrol, unit_section, school_group, status, shift_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?)`,
        [
          receiptNumber,
          req.user!.id,
          req.user!.full_name,
          Number(subtotal) || Number(total),
          Number(discount) || 0,
          Number(total),
          payment_method,
          Number(amount_paid) || Number(total),
          Number(change_amount) || 0,
          payment_reference || '',
          saleNotes,
          scout_name || null,
          scout_id || null,
          patrol || null,
          unit_section || null,
          school_group || null,
          shift_id ? Number(shift_id) : null,
          timestamp,
        ]
      );

      const saleId = saleInsert.lastInsertRowid;

      // 2. Insert Sale Items, deduct inventory, and record stock movement
      for (const item of items) {
        const prod = queryOne<{ id: number; name: string; barcode: string; cost_price: number; stock_quantity: number }>(
          'SELECT id, name, barcode, cost_price, stock_quantity FROM products WHERE id = ?',
          [item.product_id]
        )!;

        const qty = Number(item.quantity);
        const unitPrice = Number(item.unit_price);
        const itemDiscount = Number(item.discount) || 0;
        const itemSubtotal = (unitPrice * qty) - itemDiscount;

        execute(
          `INSERT INTO sale_items (sale_id, product_id, product_name, barcode, quantity, unit_cost, unit_price, discount, subtotal)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [saleId, prod.id, prod.name, prod.barcode, qty, prod.cost_price, unitPrice, itemDiscount, itemSubtotal]
        );

        // Deduct inventory
        const newStock = prod.stock_quantity - qty;
        execute('UPDATE products SET stock_quantity = ?, updated_at = ? WHERE id = ?', [newStock, timestamp, prod.id]);

        // Record stock movement
        execute(
          `INSERT INTO inventory_movements (product_id, product_name, change_qty, previous_qty, new_qty, reason, reference_id, user_name, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            prod.id,
            prod.name,
            -qty,
            prod.stock_quantity,
            newStock,
            `Sale POS - Receipt #${receiptNumber}`,
            receiptNumber,
            req.user!.username,
            timestamp,
          ]
        );
      }

      // 3. Record Payment
      execute(
        `INSERT INTO payments (sale_id, payment_method, amount, reference_number, cashier_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [saleId, payment_method, Number(total), payment_reference || '', req.user!.id, timestamp]
      );

      // 4. Update shift totals if shift is active
      if (shift_id) {
        const amt = Number(total);
        if (payment_method === 'Cash') {
          execute(
            `UPDATE cashier_shifts SET cash_sales = cash_sales + ?, total_sales = total_sales + ?, expected_cash = expected_cash + ? WHERE id = ?`,
            [amt, amt, amt, shift_id]
          );
        } else if (payment_method === 'MTN Mobile Money') {
          execute(
            `UPDATE cashier_shifts SET mtn_momo_sales = mtn_momo_sales + ?, total_sales = total_sales + ? WHERE id = ?`,
            [amt, amt, shift_id]
          );
        } else if (payment_method === 'Airtel Money') {
          execute(
            `UPDATE cashier_shifts SET airtel_money_sales = airtel_money_sales + ?, total_sales = total_sales + ? WHERE id = ?`,
            [amt, amt, shift_id]
          );
        } else if (payment_method === 'Card') {
          execute(
            `UPDATE cashier_shifts SET card_sales = card_sales + ?, total_sales = total_sales + ? WHERE id = ?`,
            [amt, amt, shift_id]
          );
        } else {
          execute(
            `UPDATE cashier_shifts SET other_sales = other_sales + ?, total_sales = total_sales + ? WHERE id = ?`,
            [amt, amt, shift_id]
          );
        }
      }

      return saleId;
    });

    logAudit(
      req.user!.username,
      'SALE_COMPLETED',
      'SALE',
      String(saleResult),
      `Sale ${receiptNumber} completed by ${req.user!.username}. Total: UGX ${total} (${payment_method})`
    );

    // Retrieve full completed sale for response
    const sale = queryOne('SELECT * FROM sales WHERE id = ?', [saleResult]);
    const saleItems = queryAll('SELECT * FROM sale_items WHERE sale_id = ?', [saleResult]);

    res.json({
      success: true,
      sale: {
        ...sale,
        items: saleItems,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Transaction failed. Sale was rolled back.' });
  }
});

// -----------------------------------------------------------------------------
// SALES HISTORY & RECEIPTS
// -----------------------------------------------------------------------------
apiRouter.get('/sales', authenticate, (req: Request, res: Response) => {
  try {
    const { dateFilter, startDate, endDate, cashier, paymentMethod, limit = 100 } = req.query;

    let sql = 'SELECT * FROM sales WHERE 1=1';
    const params: (string | number)[] = [];

    const now = new Date();
    if (dateFilter === 'today') {
      const todayStr = now.toISOString().slice(0, 10);
      sql += ' AND created_at >= ?';
      params.push(`${todayStr}T00:00:00.000Z`);
    } else if (dateFilter === 'yesterday') {
      const y = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const yStr = y.toISOString().slice(0, 10);
      const tStr = now.toISOString().slice(0, 10);
      sql += ' AND created_at >= ? AND created_at < ?';
      params.push(`${yStr}T00:00:00.000Z`, `${tStr}T00:00:00.000Z`);
    } else if (dateFilter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      sql += ' AND created_at >= ?';
      params.push(weekAgo.toISOString());
    } else if (dateFilter === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      sql += ' AND created_at >= ?';
      params.push(monthAgo.toISOString());
    } else if (startDate && endDate) {
      sql += ' AND created_at >= ? AND created_at <= ?';
      params.push(`${startDate}T00:00:00.000Z`, `${endDate}T23:59:59.999Z`);
    }

    if (cashier && cashier !== 'All') {
      sql += ' AND cashier_name = ?';
      params.push(String(cashier));
    }

    if (paymentMethod && paymentMethod !== 'All') {
      sql += ' AND payment_method = ?';
      params.push(String(paymentMethod));
    }

    sql += ' ORDER BY id DESC LIMIT ?';
    params.push(Number(limit));

    const sales = queryAll(sql, params);
    res.json({ sales });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/sales/:id', authenticate, (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const isReceipt = id.startsWith('SC-');
    const sale = isReceipt
      ? queryOne('SELECT * FROM sales WHERE receipt_number = ?', [id])
      : queryOne('SELECT * FROM sales WHERE id = ?', [Number(id)]);

    if (!sale) return res.status(404).json({ error: 'Sale record not found.' });

    const items = queryAll('SELECT * FROM sale_items WHERE sale_id = ?', [sale.id]);
    const payments = queryAll('SELECT * FROM payments WHERE sale_id = ?', [sale.id]);

    res.json({
      sale: {
        ...sale,
        items,
        payments,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------------------------------------------
// HELD SALES (HOLD & RETRIEVE)
// -----------------------------------------------------------------------------
apiRouter.get('/held-sales', authenticate, (_req: Request, res: Response) => {
  const heldSales = queryAll('SELECT * FROM held_sales ORDER BY created_at DESC');
  const parsed = heldSales.map((h: any) => ({
    ...h,
    cart: JSON.parse(h.cart_data || '[]'),
  }));
  res.json({ heldSales: parsed });
});

apiRouter.post('/held-sales', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { reference_name, cart, total_amount } = req.body;
    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      return res.status(400).json({ error: 'Cannot hold an empty cart.' });
    }

    const id = `HOLD-${Date.now().toString(36).toUpperCase()}`;
    const now = new Date().toISOString();

    execute(
      `INSERT INTO held_sales (id, reference_name, cashier_name, cart_data, total_amount, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, reference_name || 'Held Sale', req.user!.username, JSON.stringify(cart), Number(total_amount) || 0, now]
    );

    res.json({ success: true, id, message: 'Sale held successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/held-sales/:id', authenticate, (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    execute('DELETE FROM held_sales WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------------------------------------------
// RETURNS & REFUNDS
// -----------------------------------------------------------------------------
apiRouter.post('/returns', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { receipt_number, refund_items, refund_amount, reason } = req.body;
    if (!receipt_number || !refund_items || !Array.isArray(refund_items) || refund_items.length === 0) {
      return res.status(400).json({ error: 'Receipt number and returned items are required.' });
    }

    const sale = queryOne<{ id: number; receipt_number: string; total: number; status: string }>(
      'SELECT * FROM sales WHERE receipt_number = ?',
      [receipt_number]
    );
    if (!sale) {
      return res.status(404).json({ error: 'Original receipt not found.' });
    }

    const now = new Date().toISOString();

    const returnId = runTransaction(() => {
      // 1. Create return header
      const retInsert = execute(
        `INSERT INTO returns (receipt_number, sale_id, original_total, refund_amount, reason, cashier_name, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [receipt_number, sale.id, sale.total, Number(refund_amount), reason || 'Customer return', req.user!.username, now]
      );
      const retId = retInsert.lastInsertRowid;

      // 2. Process return items and restock
      for (const item of refund_items) {
        const qty = Number(item.quantity);
        const subtotal = Number(item.refund_subtotal);
        const restock = item.restocked !== false ? 1 : 0;

        execute(
          `INSERT INTO return_items (return_id, product_id, product_name, quantity, refund_subtotal, restocked)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [retId, item.product_id, item.product_name, qty, subtotal, restock]
        );

        if (restock) {
          const prod = queryOne<{ id: number; stock_quantity: number }>('SELECT id, stock_quantity FROM products WHERE id = ?', [item.product_id]);
          if (prod) {
            const newStock = prod.stock_quantity + qty;
            execute('UPDATE products SET stock_quantity = ?, updated_at = ? WHERE id = ?', [newStock, now, prod.id]);

            execute(
              `INSERT INTO inventory_movements (product_id, product_name, change_qty, previous_qty, new_qty, reason, reference_id, user_name, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                prod.id,
                item.product_name,
                qty,
                prod.stock_quantity,
                newStock,
                `Return/Refund - ${reason || 'Return'} (${receipt_number})`,
                receipt_number,
                req.user!.username,
                now,
              ]
            );
          }
        }
      }

      // Mark sale as partially returned or refunded
      execute("UPDATE sales SET status = 'refunded' WHERE id = ?", [sale.id]);
      return retId;
    });

    logAudit(
      req.user!.username,
      'RETURN_PROCESSED',
      'RETURN',
      String(returnId),
      `Refund processed for receipt ${receipt_number}. Refund amount: UGX ${refund_amount}. Reason: ${reason}`
    );

    res.json({ success: true, return_id: returnId, message: 'Return and refund processed successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to process return.' });
  }
});

// -----------------------------------------------------------------------------
// INVENTORY & STOCK ADJUSTMENTS
// -----------------------------------------------------------------------------
apiRouter.get('/inventory', authenticate, (_req: Request, res: Response) => {
  try {
    const products = queryAll(`
      SELECT id, barcode, name, category, cost_price, selling_price, stock_quantity, min_stock_level, unit, is_active 
      FROM products 
      ORDER BY stock_quantity ASC, name ASC
    `);

    let totalCostVal = 0;
    let totalRetailVal = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const p of products as any[]) {
      if (p.is_active === 1) {
        totalCostVal += (p.cost_price || 0) * Math.max(0, p.stock_quantity);
        totalRetailVal += (p.selling_price || 0) * Math.max(0, p.stock_quantity);
        if (p.stock_quantity <= 0) {
          outOfStockCount++;
        } else if (p.stock_quantity <= p.min_stock_level) {
          lowStockCount++;
        }
      }
    }

    res.json({
      products,
      summary: {
        totalCostVal,
        totalRetailVal,
        potentialProfit: totalRetailVal - totalCostVal,
        lowStockCount,
        outOfStockCount,
        totalProducts: products.length,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/inventory/adjust', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { product_id, change_qty, reason, notes } = req.body;
    if (!product_id || change_qty === undefined || !reason) {
      return res.status(400).json({ error: 'Product ID, quantity change, and adjustment reason are required.' });
    }

    const prod = queryOne<{ id: number; name: string; stock_quantity: number }>('SELECT id, name, stock_quantity FROM products WHERE id = ?', [product_id]);
    if (!prod) return res.status(404).json({ error: 'Product not found.' });

    const diff = Number(change_qty);
    const newStock = prod.stock_quantity + diff;
    const now = new Date().toISOString();

    runTransaction(() => {
      execute('UPDATE products SET stock_quantity = ?, updated_at = ? WHERE id = ?', [newStock, now, prod.id]);
      execute(
        `INSERT INTO inventory_movements (product_id, product_name, change_qty, previous_qty, new_qty, reason, reference_id, user_name, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          prod.id,
          prod.name,
          diff,
          prod.stock_quantity,
          newStock,
          `${reason} ${notes ? '(' + notes + ')' : ''}`.trim(),
          'MANUAL-ADJ',
          req.user!.username,
          now,
        ]
      );
    });

    logAudit(
      req.user!.username,
      'INVENTORY_ADJUST',
      'PRODUCT',
      String(prod.id),
      `Adjusted stock for "${prod.name}" by ${diff > 0 ? '+' : ''}${diff}. Previous: ${prod.stock_quantity}, New: ${newStock}. Reason: ${reason}`
    );

    res.json({ success: true, new_stock: newStock, message: 'Stock adjusted successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/inventory/movements', authenticate, (req: Request, res: Response) => {
  try {
    const { product_id, limit = 100 } = req.query;
    let sql = 'SELECT * FROM inventory_movements WHERE 1=1';
    const params: (string | number)[] = [];

    if (product_id) {
      sql += ' AND product_id = ?';
      params.push(Number(product_id));
    }

    sql += ' ORDER BY id DESC LIMIT ?';
    params.push(Number(limit));

    const movements = queryAll(sql, params);
    res.json({ movements });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------------------------------------------
// CASHIER SHIFTS
// -----------------------------------------------------------------------------
apiRouter.get('/shifts/current', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const shift = queryOne('SELECT * FROM cashier_shifts WHERE cashier_id = ? AND status = "open"', [req.user!.id]);
    res.json({ shift });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/shifts/open', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { opening_cash } = req.body;
    const existing = queryOne('SELECT id FROM cashier_shifts WHERE cashier_id = ? AND status = "open"', [req.user!.id]);
    if (existing) {
      return res.status(400).json({ error: 'You already have an active open shift.' });
    }

    const float = Number(opening_cash) || 0;
    const now = new Date().toISOString();

    const result = execute(
      `INSERT INTO cashier_shifts (cashier_id, cashier_name, opening_cash, cash_sales, mtn_momo_sales, airtel_money_sales, card_sales, other_sales, total_sales, expected_cash, status, opened_at)
       VALUES (?, ?, ?, 0, 0, 0, 0, 0, 0, ?, 'open', ?)`,
      [req.user!.id, req.user!.full_name, float, float, now]
    );

    logAudit(req.user!.username, 'SHIFT_OPEN', 'SHIFT', String(result.lastInsertRowid), `Opened cashier shift with opening cash float UGX ${float}`);
    res.json({ success: true, shift_id: result.lastInsertRowid });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/shifts/close', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { shift_id, actual_cash, notes } = req.body;
    const shift = queryOne<{
      id: number;
      opening_cash: number;
      cash_sales: number;
      expected_cash: number;
      status: string;
    }>('SELECT * FROM cashier_shifts WHERE id = ?', [shift_id]);

    if (!shift || shift.status !== 'open') {
      return res.status(400).json({ error: 'Active open shift not found.' });
    }

    const countedCash = Number(actual_cash) || 0;
    const expected = shift.opening_cash + shift.cash_sales;
    const diff = countedCash - expected;
    const now = new Date().toISOString();

    execute(
      `UPDATE cashier_shifts 
       SET actual_cash = ?, difference = ?, notes = ?, status = 'closed', closed_at = ?
       WHERE id = ?`,
      [countedCash, diff, notes || '', now, shift.id]
    );

    logAudit(
      req.user!.username,
      'SHIFT_CLOSE',
      'SHIFT',
      String(shift.id),
      `Closed shift #${shift.id}. Expected cash: UGX ${expected}, Counted: UGX ${countedCash}, Diff: UGX ${diff}`
    );

    const closed = queryOne('SELECT * FROM cashier_shifts WHERE id = ?', [shift.id]);
    res.json({ success: true, shift: closed });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/shifts/history', authenticate, (_req: Request, res: Response) => {
  const shifts = queryAll('SELECT * FROM cashier_shifts ORDER BY id DESC LIMIT 50');
  res.json({ shifts });
});

// -----------------------------------------------------------------------------
// REPORTS & ANALYTICS
// -----------------------------------------------------------------------------
apiRouter.get('/reports/dashboard', authenticate, (_req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const todaySales = queryAll<any>('SELECT * FROM sales WHERE created_at >= ?', [`${today}T00:00:00.000Z`]);

    let todayTotal = 0;
    let cashTotal = 0;
    let momoTotal = 0;
    let airtelTotal = 0;
    let cardTotal = 0;
    let otherTotal = 0;

    for (const s of todaySales) {
      todayTotal += s.total || 0;
      if (s.payment_method === 'Cash') cashTotal += s.total;
      else if (s.payment_method === 'MTN Mobile Money') momoTotal += s.total;
      else if (s.payment_method === 'Airtel Money') airtelTotal += s.total;
      else if (s.payment_method === 'Card') cardTotal += s.total;
      else otherTotal += s.total;
    }

    // Top selling products all-time / 30-days
    const topProducts = queryAll(`
      SELECT product_name, SUM(quantity) as total_qty, SUM(subtotal) as total_sales
      FROM sale_items
      GROUP BY product_id
      ORDER BY total_qty DESC
      LIMIT 6
    `);

    // Sales by Category
    const salesByCategory = queryAll(`
      SELECT p.category, SUM(si.quantity) as total_qty, SUM(si.subtotal) as total_sales
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      GROUP BY p.category
      ORDER BY total_sales DESC
    `);

    // Inventory metrics
    const lowStock = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM products WHERE stock_quantity <= min_stock_level AND stock_quantity > 0 AND is_active = 1');
    const outOfStock = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM products WHERE stock_quantity <= 0 AND is_active = 1');
    const totalProducts = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM products WHERE is_active = 1');

    // Recent 10 transactions
    const recentSales = queryAll('SELECT id, receipt_number, cashier_name, total, payment_method, created_at, scout_name, patrol FROM sales ORDER BY id DESC LIMIT 10');

    res.json({
      today: {
        total: todayTotal,
        transactionCount: todaySales.length,
        cash: cashTotal,
        mtnMomo: momoTotal,
        airtelMoney: airtelTotal,
        card: cardTotal,
        other: otherTotal,
      },
      inventory: {
        lowStock: lowStock?.count || 0,
        outOfStock: outOfStock?.count || 0,
        totalProducts: totalProducts?.count || 0,
      },
      topProducts,
      salesByCategory,
      recentSales,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/reports/detailed', authenticate, (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    let sql = 'SELECT * FROM sales WHERE 1=1';
    const params: string[] = [];

    if (startDate && endDate) {
      sql += ' AND created_at >= ? AND created_at <= ?';
      params.push(`${startDate}T00:00:00.000Z`, `${endDate}T23:59:59.999Z`);
    }

    const sales = queryAll<any>(sql, params);

    // Calculate gross profit
    let totalRevenue = 0;
    let totalCost = 0;
    let totalDiscounts = 0;

    const saleIds = sales.map((s) => s.id);
    let items: any[] = [];
    if (saleIds.length > 0) {
      // In SQLite we can query sale_items for these sales
      items = queryAll(`SELECT * FROM sale_items WHERE sale_id IN (${saleIds.join(',')})`);
    }

    for (const s of sales) {
      totalRevenue += s.total || 0;
      totalDiscounts += s.discount || 0;
    }

    for (const it of items) {
      totalCost += (it.unit_cost || 0) * (it.quantity || 1);
    }

    const grossProfit = totalRevenue - totalCost;
    const marginPct = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    // Sales by Scout Patrol / Unit
    const salesByPatrol = queryAll(`
      SELECT COALESCE(patrol, 'Unspecified') as patrol_name, COUNT(*) as count, SUM(total) as total_sales
      FROM sales
      WHERE patrol IS NOT NULL AND patrol != ''
      GROUP BY patrol
      ORDER BY total_sales DESC
    `);

    const salesByUnit = queryAll(`
      SELECT COALESCE(unit_section, 'General') as unit_name, COUNT(*) as count, SUM(total) as total_sales
      FROM sales
      WHERE unit_section IS NOT NULL AND unit_section != ''
      GROUP BY unit_section
      ORDER BY total_sales DESC
    `);

    // Sales by Cashier
    const salesByCashier = queryAll(`
      SELECT cashier_name, COUNT(*) as transaction_count, SUM(total) as total_sales
      FROM sales
      GROUP BY cashier_name
      ORDER BY total_sales DESC
    `);

    res.json({
      summary: {
        totalRevenue,
        totalCost,
        grossProfit,
        marginPct: Number(marginPct.toFixed(1)),
        totalDiscounts,
        transactionCount: sales.length,
      },
      salesByPatrol,
      salesByUnit,
      salesByCashier,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// CSV Export route
apiRouter.get('/reports/export-csv', authenticate, (req: Request, res: Response) => {
  try {
    const type = req.query.type as string; // 'sales', 'inventory', 'products'

    if (type === 'sales') {
      const sales = queryAll('SELECT receipt_number, cashier_name, total, payment_method, scout_name, patrol, created_at FROM sales ORDER BY id DESC');
      let csv = 'Receipt,Cashier,Total UGX,Payment Method,Scout Name,Patrol,Date Time\n';
      for (const s of sales as any[]) {
        csv += `"${s.receipt_number}","${s.cashier_name}",${s.total},"${s.payment_method}","${s.scout_name || ''}","${s.patrol || ''}","${s.created_at}"\n`;
      }
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="scouts_sales_report.csv"');
      return res.send(csv);
    }

    if (type === 'inventory' || type === 'products') {
      const products = queryAll('SELECT barcode, name, category, cost_price, selling_price, stock_quantity, min_stock_level, unit FROM products ORDER BY name ASC');
      let csv = 'Barcode,Product Name,Category,Cost Price UGX,Selling Price UGX,Current Stock,Min Stock,Unit\n';
      for (const p of products as any[]) {
        csv += `"${p.barcode}","${p.name.replace(/"/g, '""')}","${p.category}",${p.cost_price},${p.selling_price},${p.stock_quantity},${p.min_stock_level},"${p.unit}"\n`;
      }
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="scouts_inventory_catalog.csv"');
      return res.send(csv);
    }

    res.status(400).send('Invalid export type. Specify ?type=sales or ?type=products');
  } catch (err: any) {
    res.status(500).send(err.message);
  }
});

// -----------------------------------------------------------------------------
// SCOUT MEMBERS DIRECTORY
// -----------------------------------------------------------------------------
apiRouter.get('/scouts', authenticate, (_req: Request, res: Response) => {
  const scouts = queryAll('SELECT * FROM scout_members ORDER BY full_name ASC');
  res.json({ scouts });
});

apiRouter.post('/scouts', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { member_number, full_name, patrol, unit_section, group_name, contact } = req.body;
    if (!member_number || !full_name) {
      return res.status(400).json({ error: 'Member number and full name are required.' });
    }

    const cleanNum = String(member_number).trim();
    const existing = queryOne('SELECT id FROM scout_members WHERE member_number = ?', [cleanNum]);
    if (existing) {
      return res.status(400).json({ error: 'Scout member with this number already exists.' });
    }

    const now = new Date().toISOString();
    const resId = execute(
      `INSERT INTO scout_members (member_number, full_name, patrol, unit_section, group_name, contact, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [cleanNum, full_name.trim(), patrol || '', unit_section || '', group_name || '', contact || '', now]
    );

    res.json({ success: true, id: resId.lastInsertRowid });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------------------------------------------
// SETTINGS
// -----------------------------------------------------------------------------
apiRouter.get('/settings', authenticate, (_req: Request, res: Response) => {
  const rows = queryAll<{ key: string; value: string }>('SELECT key, value FROM settings');
  const settings: Record<string, string> = {};
  for (const r of rows) {
    settings[r.key] = r.value;
  }
  res.json({ settings });
});

apiRouter.post('/settings', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Settings object is required.' });
    }

    const now = new Date().toISOString();
    runTransaction(() => {
      for (const [key, value] of Object.entries(settings)) {
        execute(
          'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)',
          [key, String(value), now]
        );
      }
    });

    logAudit(req.user!.username, 'SETTINGS_UPDATE', 'SETTINGS', null, 'Updated system settings');
    res.json({ success: true, message: 'Settings saved successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------------------------------------------
// AUDIT LOGS
// -----------------------------------------------------------------------------
apiRouter.get('/audit-logs', authenticate, requireAdmin, (req: Request, res: Response) => {
  const limit = Number(req.query.limit) || 100;
  const logs = queryAll('SELECT * FROM audit_logs ORDER BY id DESC LIMIT ?', [limit]);
  res.json({ logs });
});

// -----------------------------------------------------------------------------
// DATABASE BACKUP & RESTORE
// -----------------------------------------------------------------------------
apiRouter.get('/backup/download', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const buffer = exportDbBuffer();
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `scouts_canteen_pos_backup_${dateStr}.sqlite`;

    logAudit(req.user!.username, 'DATABASE_BACKUP', 'DATABASE', null, 'Downloaded database backup');

    res.setHeader('Content-Type', 'application/x-sqlite3');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Backup export failed.' });
  }
});

apiRouter.post('/backup/restore', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { base64Data } = req.body;
    if (!base64Data) {
      return res.status(400).json({ error: 'Database file data is missing.' });
    }

    const buffer = Buffer.from(base64Data, 'base64');
    await importDbBuffer(buffer);

    logAudit(req.user!.username, 'DATABASE_RESTORE', 'DATABASE', null, 'Restored database from uploaded backup file');
    res.json({ success: true, message: 'Database restored successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Restore failed.' });
  }
});
