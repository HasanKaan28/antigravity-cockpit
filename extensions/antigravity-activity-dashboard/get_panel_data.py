import sqlite3
import json
import os
import sys

def get_panel_data():
    appdata = os.environ.get('APPDATA', os.path.join(os.path.expanduser('~'), 'AppData', 'Roaming'))
    candidates = [
        os.path.join(appdata, 'Antigravity IDE', 'User', 'globalStorage', 'state.vscdb'),
        os.path.join(appdata, 'Antigravity', 'User', 'globalStorage', 'state.vscdb'),
        os.path.join(appdata, 'Code', 'User', 'globalStorage', 'state.vscdb'),
    ]
    
    for db_path in candidates:
        if os.path.exists(db_path):
            try:
                conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
                c = conn.cursor()
                c.execute("SELECT value FROM ItemTable WHERE key = 'n2ns.antigravity-panel'")
                row = c.fetchone()
                conn.close()
                if row and row[0]:
                    data = json.loads(row[0])
                    view_state = data.get('tfa.lastViewState') or {}
                    user_info = data.get('tfa.lastUserInfo') or {}
                    token_usage = data.get('tfa.lastTokenUsage') or {}
                    history = data.get('tfa.quotaHistory_v2') or []
                    
                    return {
                        'status': 'ok',
                        'groups': view_state.get('groups', []),
                        'user': user_info,
                        'tokenUsage': token_usage,
                        'historyCount': len(history),
                        'rawViewState': view_state
                    }
            except Exception as e:
                pass
                
    return {'status': 'not_found', 'groups': []}

if __name__ == '__main__':
    result = get_panel_data()
    print(json.dumps(result))
