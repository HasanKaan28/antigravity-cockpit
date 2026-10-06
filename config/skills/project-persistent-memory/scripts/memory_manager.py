import os
import sys
import json
import time

sys.stdout.reconfigure(encoding='utf-8')

REGISTRY_PATH = os.path.expanduser(os.path.join("~", ".gemini", "config", "project_memory_registry.json"))

def get_registry():
    if os.path.exists(REGISTRY_PATH):
        try:
            with open(REGISTRY_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_registry(data):
    os.makedirs(os.path.dirname(REGISTRY_PATH), exist_ok=True)
    with open(REGISTRY_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def update_project_memory(project_name, project_path, tech_stack, architecture_summary, key_files=None):
    registry = get_registry()
    registry[project_name] = {
        "project_path": project_path,
        "tech_stack": tech_stack,
        "architecture_summary": architecture_summary,
        "key_files": key_files or [],
        "last_updated": time.strftime("%Y-%m-%d %H:%M:%S")
    }
    save_registry(registry)
    print(f"Project memory updated for '{project_name}'.")

if __name__ == "__main__":
    print(f"Project Memory Registry is located at: {REGISTRY_PATH}")
    current_registry = get_registry()
    print(f"Total projects tracked: {len(current_registry)}")
