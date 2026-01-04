#!/usr/bin/env python3
import os
import psycopg2
import redis
from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Database configuration
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'postgres'),
    'port': os.getenv('DB_PORT', '5432'),
    'database': os.getenv('DB_NAME', 'voip_db'),
    'user': os.getenv('DB_USER', 'voip_user'),
    'password': os.getenv('DB_PASSWORD', 'voip_pass_2024')
}

# Redis configuration
REDIS_HOST = os.getenv('REDIS_HOST', 'redis')
REDIS_PASSWORD = os.getenv('REDIS_PASSWORD', 'redis_pass_2024')

redis_client = redis.Redis(
    host=REDIS_HOST,
    port=6379,
    password=REDIS_PASSWORD,
    decode_responses=True
)

def get_db_connection():
    """Get database connection"""
    return psycopg2.connect(**DB_CONFIG)

@app.route('/')
def index():
    """Dashboard home page"""
    return render_template('index.html')

@app.route('/api/stats')
def get_stats():
    """Get system statistics"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Get total calls
        cur.execute("SELECT COUNT(*) FROM call_logs")
        total_calls = cur.fetchone()[0]
        
        # Get active calls
        cur.execute("SELECT COUNT(*) FROM active_calls")
        active_calls = cur.fetchone()[0]
        
        # Get total agents
        cur.execute("SELECT COUNT(*) FROM agents WHERE status = 'online'")
        online_agents = cur.fetchone()[0]
        
        # Get calls today
        cur.execute("""
            SELECT COUNT(*) FROM call_logs 
            WHERE DATE(start_time) = CURRENT_DATE
        """)
        calls_today = cur.fetchone()[0]
        
        cur.close()
        conn.close()
        
        return jsonify({
            'total_calls': total_calls,
            'active_calls': active_calls,
            'online_agents': online_agents,
            'calls_today': calls_today,
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/extensions')
def get_extensions():
    """Get all extensions"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT id, extension, name, email, enabled 
            FROM extensions 
            ORDER BY extension
        """)
        
        extensions = []
        for row in cur.fetchall():
            extensions.append({
                'id': row[0],
                'extension': row[1],
                'name': row[2],
                'email': row[3],
                'enabled': row[4]
            })
        
        cur.close()
        conn.close()
        
        return jsonify(extensions)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/calls/recent')
def get_recent_calls():
    """Get recent calls"""
    try:
        limit = request.args.get('limit', 50, type=int)
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT call_id, from_number, to_number, status, 
                   start_time, end_time, duration
            FROM call_logs
            ORDER BY start_time DESC
            LIMIT %s
        """, (limit,))
        
        calls = []
        for row in cur.fetchall():
            calls.append({
                'call_id': row[0],
                'from': row[1],
                'to': row[2],
                'status': row[3],
                'start_time': row[4].isoformat() if row[4] else None,
                'end_time': row[5].isoformat() if row[5] else None,
                'duration': row[6]
            })
        
        cur.close()
        conn.close()
        
        return jsonify(calls)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/agents')
def get_agents():
    """Get all agents"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT extension, name, email, status, 
                   current_calls, total_calls
            FROM agents
            ORDER BY name
        """)
        
        agents = []
        for row in cur.fetchall():
            agents.append({
                'extension': row[0],
                'name': row[1],
                'email': row[2],
                'status': row[3],
                'current_calls': row[4],
                'total_calls': row[5]
            })
        
        cur.close()
        conn.close()
        
        return jsonify(agents)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/agents/<extension>/status', methods=['POST'])
def update_agent_status(extension):
    """Update agent status"""
    try:
        data = request.get_json()
        status = data.get('status')
        
        if status not in ['online', 'offline', 'busy', 'away']:
            return jsonify({'error': 'Invalid status'}), 400
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            UPDATE agents 
            SET status = %s, updated_at = NOW()
            WHERE extension = %s
        """, (status, extension))
        
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({'success': True, 'extension': extension, 'status': status})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/kamailio/status')
def get_kamailio_status():
    """Get Kamailio status"""
    try:
        # In production, this would query Kamailio via RPC
        return jsonify({
            'status': 'running',
            'version': '5.7',
            'uptime': 'N/A',
            'active_transactions': 0
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/health')
def health_check():
    """Health check endpoint"""
    try:
        # Check database
        conn = get_db_connection()
        conn.close()
        
        # Check Redis
        redis_client.ping()
        
        return jsonify({
            'status': 'healthy',
            'database': 'ok',
            'redis': 'ok'
        })
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
