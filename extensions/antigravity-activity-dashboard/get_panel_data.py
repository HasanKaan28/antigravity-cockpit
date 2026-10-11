import sqlite3
import json
import os
import sys

def get_panel_data():
    candidates = []
    if sys.platform == 'win32':
        appdata = os.environ.get('APPDATA', '')
        if appdata:
            candidates.extend([
                os.path.join(appdata, 'Antigravity IDE', 'User', 'globalStorage', 'state.vscdb'),
                os.path.join(appdata, 'Antigravity', 'User', 'globalStorage', 'state.vscdb'),
                os.path.join(appdata, 'Code', 'User', 'globalStorage', 'state.vscdb'),
            ])
    elif sys.platform == 'darwin':
        home = os.path.expanduser('~')
        candidates.extend([
            os.path.join(home, 'Library', 'Application Support', 'Antigravity IDE', 'User', 'globalStorage', 'state.vscdb'),
            os.path.join(home, 'Library', 'Application Support', 'Antigravity', 'User', 'globalStorage', 'state.vscdb'),
            os.path.join(home, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'state.vscdb'),
        ])
    else:
        home = os.path.expanduser('~')
        candidates.extend([
            os.path.join(home, '.config', 'Antigravity IDE', 'User', 'globalStorage', 'state.vscdb'),
            os.path.join(home, '.config', 'Antigravity', 'User', 'globalStorage', 'state.vscdb'),
            os.path.join(home, '.config', 'Code', 'User', 'globalStorage', 'state.vscdb'),
        ])

    existing_candidates = [p for p in candidates if os.path.exists(p)]
    # Prioritize the most recently modified state.vscdb database
    existing_candidates.sort(key=lambda p: os.path.getmtime(p), reverse=True)

    for db_path in existing_candidates:
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
                    'rawViewState': view_state,
                    'lastSyncTimestamp': int(os.path.getmtime(db_path) * 1000)
                }
        except Exception:
            pass
            
    return {'status': 'not_found', 'groups': []}

if __name__ == '__main__':
    result = get_panel_data()
    print(json.dumps(result))
