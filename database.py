# database.py - SQLite Database for SmartPrint
import sqlite3
import random
import os
import json
import shutil
import tempfile
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SOURCE_DB_PATH = os.path.join(BASE_DIR, 'smartprint.db')

# Vercel's deployed filesystem is read-only except for /tmp. Copy the bundled
# seed database there once per warm function instance so the API can still
# perform its demo writes.
if os.getenv('VERCEL') == '1':
    RUNTIME_DIR = os.path.join(tempfile.gettempdir(), 'smartprint')
    os.makedirs(RUNTIME_DIR, exist_ok=True)
    DB_PATH = os.path.join(RUNTIME_DIR, 'smartprint.db')
    if not os.path.exists(DB_PATH) and os.path.exists(SOURCE_DB_PATH):
        shutil.copyfile(SOURCE_DB_PATH, DB_PATH)
else:
    DB_PATH = os.getenv('SMARTPRINT_DB_PATH', SOURCE_DB_PATH)

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Orders Table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                token TEXT UNIQUE NOT NULL,
                student_name TEXT NOT NULL,
                roll_no TEXT NOT NULL,
                phone TEXT DEFAULT '',
                document_name TEXT NOT NULL,
                file_path TEXT DEFAULT '',
                file_size INTEGER DEFAULT 0,
                total_pages INTEGER NOT NULL,
                page_range TEXT DEFAULT 'All',
                calculated_pages INTEGER NOT NULL,
                copies INTEGER DEFAULT 1,
                color_mode TEXT DEFAULT 'bw',
                sides TEXT DEFAULT 'double',
                paper_type TEXT DEFAULT 'standard',
                binding TEXT DEFAULT 'none',
                special_notes TEXT DEFAULT '',
                total_price REAL NOT NULL,
                payment_method TEXT DEFAULT 'upi',
                payment_status TEXT DEFAULT 'paid',
                status TEXT DEFAULT 'Received',
                estimated_wait_min INTEGER DEFAULT 5,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Settings Table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
        ''')
        
        # Seed default settings
        default_settings = {
            'rate_bw': '1.50',
            'rate_color': '5.00',
            'rate_double_discount': '0.15',
            'rate_staple': '1.00',
            'rate_spiral': '25.00',
            'rate_soft_binding': '40.00',
            'avg_sec_per_page': '1.5',
            'active_printers': '2',
            'shop_open': 'true'
        }
        for k, v in default_settings.items():
            cursor.execute('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', (k, v))
            
        # Check if orders table is empty; if so, populate initial realistic batch orders
        cursor.execute('SELECT COUNT(*) as count FROM orders')
        if cursor.fetchone()['count'] == 0:
            seed_orders = [
                (
                    'SKC-2026-A101', 'Yasvanth V', '26AD470', '9876543210',
                    'EIDT_Review1_SmartPrint.pdf', '', 16, 'All', 16, 1,
                    'bw', 'double', 'standard', 'spiral', 'Please staple report and bind properly with blue cover',
                    45.0, 'upi', 'paid', 'Ready', 0,
                    '2026-11-16 18:30:00'
                ),
                (
                    'SKC-2026-A102', 'Mithun G', '26AD480', '9876543211',
                    'DeepLearning_Lab_Exp4_Graphs.pdf', '', 8, '1-8', 8, 2,
                    'color', 'single', 'standard', 'staple', 'Front page in high contrast color',
                    81.0, 'upi', 'paid', 'Processing', 3,
                    '2026-11-16 18:45:00'
                ),
                (
                    'SKC-2026-A103', 'Yeshwanth K', '26AD471', '9876543212',
                    'AI_Ethics_CaseStudy_Final.pdf', '', 12, 'All', 12, 1,
                    'bw', 'double', 'standard', 'staple', 'Corner staple top-left',
                    16.5, 'card', 'paid', 'Received', 7,
                    '2026-11-16 19:00:00'
                ),
                (
                    'SKC-2026-A104', 'Fathrul Haq F', '26AD478', '9876543213',
                    'DesignThinking_Seminar_Deck.pdf', '', 20, 'All', 20, 1,
                    'color', 'double', 'premium', 'none', 'Executive 100gsm presentation paper',
                    105.0, 'upi', 'paid', 'Received', 11,
                    '2026-11-16 19:05:00'
                ),
                (
                    'SKC-2026-A099', 'Ananya R', '26AD405', '9876543214',
                    'Resume_TCS_Interview_Draft.pdf', '', 2, 'All', 2, 3,
                    'bw', 'single', 'premium', 'none', '',
                    12.0, 'cash', 'paid', 'Collected', 0,
                    '2026-11-16 17:50:00'
                )
            ]
            cursor.executemany('''
                INSERT INTO orders (
                    token, student_name, roll_no, phone,
                    document_name, file_path, total_pages, page_range, calculated_pages, copies,
                    color_mode, sides, paper_type, binding, special_notes,
                    total_price, payment_method, payment_status, status, estimated_wait_min,
                    created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', seed_orders)
            
        conn.commit()
    print('Database initialized successfully.')

def calculate_wait_time(cursor, exclude_order_id=None):
    """
    Queue wait-time estimator based on Whitt (1999) and Ibrahim & Whitt (2011) models.
    T_wait = (Pages in front * sec_per_page) / (60 * active_printers) + fixed_buffer
    """
    query = """
        SELECT SUM(calculated_pages * copies) as queue_pages
        FROM orders 
        WHERE status IN ('Received', 'Processing')
    """
    params = []
    if exclude_order_id:
        query += " AND id != ?"
        params.append(exclude_order_id)
        
    cursor.execute(query, params)
    row = cursor.fetchone()
    pages_ahead = row['queue_pages'] if row and row['queue_pages'] else 0
    
    sec_per_page = 1.5
    active_printers = 2
    
    est_minutes = int(round((pages_ahead * sec_per_page) / (60 * active_printers)))
    return max(2, est_minutes) if pages_ahead > 0 else 0

def get_orders(roll_no=None, status=None, search=None):
    with get_db() as conn:
        cursor = conn.cursor()
        query = 'SELECT * FROM orders WHERE 1=1'
        params = []
        if roll_no:
            query += ' AND LOWER(roll_no) = LOWER(?)'
            params.append(roll_no)
        if status and status != 'All':
            query += ' AND status = ?'
            params.append(status)
        if search:
            query += ' AND (token LIKE ? OR LOWER(student_name) LIKE ? OR LOWER(roll_no) LIKE ? OR LOWER(document_name) LIKE ?)'
            wild = f'%{search}%'
            params.extend([wild, wild.lower(), wild.lower(), wild.lower()])
            
        query += ' ORDER BY id DESC'
        cursor.execute(query, params)
        orders = [dict(row) for row in cursor.fetchall()]
        
        # Calculate dynamic queue position for active orders
        for o in orders:
            if o['status'] in ['Received', 'Processing']:
                cursor.execute('''
                    SELECT COUNT(*) as pos_ahead 
                    FROM orders 
                    WHERE status IN ('Received', 'Processing') AND id < ?
                ''', (o['id'],))
                o['queue_position'] = cursor.fetchone()['pos_ahead'] + 1
            else:
                o['queue_position'] = 0
                
        return orders

def get_order_by_token(token):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM orders WHERE UPPER(token) = UPPER(?)', (token.strip(),))
        row = cursor.fetchone()
        if not row:
            return None
        order = dict(row)
        if order['status'] in ['Received', 'Processing']:
            cursor.execute('''
                SELECT COUNT(*) as pos_ahead 
                FROM orders 
                WHERE status IN ('Received', 'Processing') AND id < ?
            ''', (order['id'],))
            order['queue_position'] = cursor.fetchone()['pos_ahead'] + 1
        else:
            order['queue_position'] = 0
        return order

def create_order(data):
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Generate unique token
        while True:
            rand_num = random.randint(100, 999)
            prefix_char = random.choice(['A', 'B', 'C', 'D'])
            token = f"SKC-2026-{prefix_char}{rand_num}"
            cursor.execute('SELECT 1 FROM orders WHERE token = ?', (token,))
            if not cursor.fetchone():
                break
                
        est_wait = calculate_wait_time(cursor)
        
        cursor.execute('''
            INSERT INTO orders (
                token, student_name, roll_no, phone,
                document_name, file_path, file_size, total_pages, page_range,
                calculated_pages, copies, color_mode, sides, paper_type, binding,
                special_notes, total_price, payment_method, payment_status,
                status, estimated_wait_min
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            token,
            data.get('student_name', 'Student'),
            data.get('roll_no', '26AD470'),
            data.get('phone', ''),
            data.get('document_name', 'document.pdf'),
            data.get('file_path', ''),
            data.get('file_size', 0),
            data.get('total_pages', 1),
            data.get('page_range', 'All'),
            data.get('calculated_pages', 1),
            data.get('copies', 1),
            data.get('color_mode', 'bw'),
            data.get('sides', 'double'),
            data.get('paper_type', 'standard'),
            data.get('binding', 'none'),
            data.get('special_notes', ''),
            data.get('total_price', 0.0),
            data.get('payment_method', 'upi'),
            data.get('payment_status', 'paid'),
            'Received',
            est_wait
        ))
        conn.commit()
        return get_order_by_token(token)

def update_status(order_id, new_status):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE orders 
            SET status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (new_status, order_id))
        conn.commit()
        cursor.execute('SELECT * FROM orders WHERE id = ?', (order_id,))
        row = cursor.fetchone()
        return dict(row) if row else None

def verify_token_at_counter(token):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM orders WHERE UPPER(token) = UPPER(?)', (token.strip(),))
        row = cursor.fetchone()
        if not row:
            return {'success': False, 'message': f'Token {token} not found in system.'}
        order = dict(row)
        
        if order['status'] == 'Collected':
            return {'success': False, 'message': f'Order {token} was already collected.', 'order': order}
            
        cursor.execute('''
            UPDATE orders 
            SET status = 'Collected', payment_status = 'paid', updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (order['id'],))
        conn.commit()
        order['status'] = 'Collected'
        order['payment_status'] = 'paid'
        return {'success': True, 'message': f'Order {token} successfully verified and marked Collected!', 'order': order}

def get_stats():
    with get_db() as conn:
        cursor = conn.cursor()
        
        cursor.execute('SELECT COUNT(*) as total FROM orders')
        total_orders = cursor.fetchone()['total']
        
        cursor.execute("SELECT COUNT(*) as active FROM orders WHERE status IN ('Received', 'Processing')")
        active_queue = cursor.fetchone()['active']
        
        cursor.execute("SELECT COUNT(*) as ready FROM orders WHERE status = 'Ready'")
        ready_count = cursor.fetchone()['ready']
        
        cursor.execute("SELECT COUNT(*) as collected FROM orders WHERE status = 'Collected'")
        collected_count = cursor.fetchone()['collected']
        
        cursor.execute("SELECT SUM(total_price) as rev FROM orders WHERE payment_status = 'paid'")
        rev_row = cursor.fetchone()
        total_revenue = round(rev_row['rev'], 2) if rev_row and rev_row['rev'] else 0.0
        
        # SDG 12 impact: Pages printed double sided saved 1 paper sheet per 2 pages
        cursor.execute("SELECT SUM(calculated_pages * copies) as double_pages FROM orders WHERE sides = 'double'")
        dp_row = cursor.fetchone()
        sheets_saved = (dp_row['double_pages'] // 2) if dp_row and dp_row['double_pages'] else 0
        
        # Average wait time
        cursor.execute("SELECT AVG(estimated_wait_min) as avg_wait FROM orders WHERE status IN ('Received', 'Processing')")
        w_row = cursor.fetchone()
        avg_wait = round(w_row['avg_wait'], 1) if w_row and w_row['avg_wait'] else 0
        
        return {
            'total_orders': total_orders,
            'active_queue': active_queue,
            'ready_count': ready_count,
            'collected_count': collected_count,
            'total_revenue': total_revenue,
            'sheets_saved': sheets_saved,
            'avg_wait_min': avg_wait,
            'printers': [
                {'name': 'HP LaserJet Enterprise 700', 'type': 'Monochrome / Duplex', 'status': 'Online [Active]', 'load': '3 jobs in spool'},
                {'name': 'Canon imageRUNNER ADVANCE C3530', 'type': 'Full Color Heavy-Duty', 'status': 'Online [Active]', 'load': '1 job in spool'}
            ]
        }
