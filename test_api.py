import urllib.request
import json

try:
    r = urllib.request.urlopen('http://127.0.0.1:8000/api/v1/pecas/?page_size=2')
    data = json.loads(r.read())
    print(f'Total: {data.get("count")}, Results: {len(data.get("results", []))}')
    print('API is working!')
except Exception as e:
    print(f'Error: {e}')
