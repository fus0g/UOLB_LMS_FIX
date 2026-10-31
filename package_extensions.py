import os
import json
import zipfile
import shutil

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DIST_DIR = os.path.join(BASE_DIR, 'dist')

os.makedirs(DIST_DIR, exist_ok=True)

# Files to include
INCLUDE_FILES = [
    'content.js',
    'content.css',
    'popup/popup.html',
    'popup/popup.js',
    'popup/popup.css',
    'icons/icon16.png',
    'icons/icon48.png',
    'icons/icon128.png',
    'icons/icon.svg'
]

# Read base manifest
with open(os.path.join(BASE_DIR, 'manifest.json'), 'r', encoding='utf-8') as f:
    base_manifest = json.load(f)

# 1. Package Firefox Extension (.zip / .xpi)
firefox_zip_path = os.path.join(DIST_DIR, 'uol-canvas-saml-firefox.zip')
firefox_xpi_path = os.path.join(DIST_DIR, 'uol-canvas-saml-firefox.xpi')

with zipfile.ZipFile(firefox_zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
    zf.writestr('manifest.json', json.dumps(base_manifest, indent=2))
    for rel_path in INCLUDE_FILES:
        full_path = os.path.join(BASE_DIR, rel_path)
        if os.path.exists(full_path):
            zf.write(full_path, rel_path)

shutil.copyfile(firefox_zip_path, firefox_xpi_path)
print(f"Created: {firefox_zip_path}")
print(f"Created: {firefox_xpi_path}")

# 2. Package Chrome Extension (.zip) - without gecko settings for 0 warnings
chrome_manifest = dict(base_manifest)
if 'browser_specific_settings' in chrome_manifest:
    del chrome_manifest['browser_specific_settings']

chrome_zip_path = os.path.join(DIST_DIR, 'uol-canvas-saml-chrome.zip')
with zipfile.ZipFile(chrome_zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
    zf.writestr('manifest.json', json.dumps(chrome_manifest, indent=2))
    for rel_path in INCLUDE_FILES:
        full_path = os.path.join(BASE_DIR, rel_path)
        if os.path.exists(full_path):
            zf.write(full_path, rel_path)

print(f"Created: {chrome_zip_path}")
print("Packaging complete!")

