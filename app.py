# app.py - SmartPrint Backend Server
import os
import time
from werkzeug.utils import secure_filename
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import database

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app = Flask(__name__, static_folder=BASE_DIR, static_url_path='')
CORS(app)

# Ensure database is initialized
database.init_db()

@app.route('/')
def index():
    return send_from_directory(BASE_DIR, 'index.html')

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy',
        'service': 'SmartPrint Campus Printing & Queue Management System',
        'version': '1.0.0',
        'college': 'Sri Krishna College of Engineering and Technology (SKCET)',
        'department': 'AI&DS',
        'batch': 9
    })

@app.route('/api/stats', methods=['GET'])
def get_stats():
    try:
        stats = database.get_stats()
        return jsonify({'success': True, 'data': stats})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/orders', methods=['GET'])
def list_orders():
    try:
        roll_no = request.args.get('roll_no')
        status = request.args.get('status')
        search = request.args.get('search')
        orders = database.get_orders(roll_no=roll_no, status=status, search=search)
        return jsonify({'success': True, 'count': len(orders), 'data': orders})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/orders/<token>', methods=['GET'])
def get_order(token):
    try:
        order = database.get_order_by_token(token)
        if not order:
            return jsonify({'success': False, 'error': f'Order {token} not found'}), 404
        return jsonify({'success': True, 'data': order})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/upload', methods=['POST'])
def upload_file():
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'No file part provided'}), 400
        file = request.files['file']
        if file.filename == '':
            return jsonify({'success': False, 'error': 'No file selected'}), 400
            
        filename = secure_filename(file.filename)
        timestamp = int(time.time())
        saved_name = f"{timestamp}_{filename}"
        file_path = os.path.join(UPLOAD_FOLDER, saved_name)
        file.save(file_path)
        file_size = os.path.getsize(file_path)
        
        # Simple heuristic for page count estimation based on file type & size
        ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
        est_pages = 1
        if ext == 'pdf':
            # roughly 40KB-80KB per PDF page or default to 5-10
            est_pages = max(1, min(100, int(file_size / 60000) or 4))
        elif ext in ['ppt', 'pptx']:
            est_pages = max(1, min(60, int(file_size / 90000) or 8))
        elif ext in ['doc', 'docx']:
            est_pages = max(1, min(40, int(file_size / 30000) or 3))
            
        return jsonify({
            'success': True,
            'filename': filename,
            'saved_as': saved_name,
            'file_size': file_size,
            'estimated_pages': est_pages,
            'file_url': f'/uploads/{saved_name}'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/orders', methods=['POST'])
def create_order():
    try:
        data = request.get_json(force=True)
        order = database.create_order(data)
        return jsonify({'success': True, 'message': 'Order successfully placed in print queue', 'data': order}), 201
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/orders/<int:order_id>/status', methods=['PATCH'])
def update_order_status(order_id):
    try:
        data = request.get_json(force=True)
        new_status = data.get('status')
        if not new_status:
            return jsonify({'success': False, 'error': 'Missing status field'}), 400
            
        valid_statuses = ['Received', 'Processing', 'Ready', 'Collected', 'Cancelled']
        if new_status not in valid_statuses:
            return jsonify({'success': False, 'error': f'Invalid status. Allowed: {valid_statuses}'}), 400
            
        updated = database.update_status(order_id, new_status)
        if not updated:
            return jsonify({'success': False, 'error': 'Order not found'}), 404
            
        return jsonify({'success': True, 'message': f'Status changed to {new_status}', 'data': updated})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/orders/verify', methods=['POST'])
def verify_token():
    try:
        data = request.get_json(force=True)
        token = data.get('token', '').strip()
        if not token:
            return jsonify({'success': False, 'error': 'Token is required'}), 400
            
        result = database.verify_token_at_counter(token)
        return jsonify(result)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    print("=" * 60)
    print(" SmartPrint: Campus Printing & Queue Management System")
    print(" Department of AI&DS, SKCET - Batch 9")
    print(" Server starting on: http://127.0.0.1:5000")
    print("=" * 60)
    app.run(host='0.0.0.0', port=5000, debug=False)
