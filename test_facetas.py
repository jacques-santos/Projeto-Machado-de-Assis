import urllib.request
import json

try:
    r = urllib.request.urlopen('http://127.0.0.1:8000/api/v1/pecas/facetas/')
    data = json.loads(r.read())
    print('Facetas endpoint is working!')
    for key, items in data.items():
        print(f'{key}: {len(items)} items')
        if items:
            print(f'  Sample: {items[0]}')
except Exception as e:
    print(f'Error: {e}')
