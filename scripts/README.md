# Scripts de Utilidade

## Inicialização do Servidor

- **`runserver.ps1`** (PowerShell): Inicia o servidor Django integrado
  - Uso: `.\runserver.ps1`

- **`runserver.bat`** (Batch/CMD): Inicia o servidor Django integrado
  - Uso: `runserver.bat`

## Gestão e Manutenção

- **`manage.ps1`** (PowerShell): Wrapper para o Django management
  - Uso: `.\manage.ps1 <comando>`

## Referência

Para executar comandos Django diretamente:
```bash
python manage.py <comando>
```

Exemplos:
- `python manage.py makemigrations`
- `python manage.py migrate`
- `python manage.py createsuperuser`
- `python manage.py import_pecas /caminho/arquivo.csv --encoding utf-8`
