import urllib.request
import json

try:
    # Test home page
    r = urllib.request.urlopen('http://127.0.0.1:8000/')
    html = r.read().decode('utf-8')
    print(f'Home page loaded: {len(html)} characters')
    
    # Check if key elements are present
    checks = {
        'Banco de Dados Machado de Assis': html.count('Banco de Dados Machado de Assis') > 0,
        'results-table': 'results-table' in html,
        'global-search': 'global-search' in html,
        'toggle-extra': 'toggle-extra' in html,
        'static/js/catalog.js': 'static/js/catalog.js' in html,
        'static/css/styles.css': 'static/css/styles.css' in html,
    }
    
    for check_name, found in checks.items():
        status = '✓' if found else '✗'
        print(f'{status} {check_name}')
    
    # Test credit page
    r = urllib.request.urlopen('http://127.0.0.1:8000/creditos/')
    html = r.read().decode('utf-8')
    print(f'\nCredits page loaded: {len(html)} characters')
    print('✓ Credits page content OK' if 'Créditos' in html else '✗ Credits page error')
    
    # Test about page
    r = urllib.request.urlopen('http://127.0.0.1:8000/criado-por/')
    html = r.read().decode('utf-8')
    print(f'\nAbout page loaded: {len(html)} characters')
    print('✓ About page content OK' if 'Criado por' in html else '✗ About page error')
    
except Exception as e:
    print(f'Error: {e}')
    import traceback
    traceback.print_exc()
