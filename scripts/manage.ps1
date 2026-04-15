# Script genérico para rodar qualquer comando Django com o venv
# Uso: .\manage.ps1 runserver
#      .\manage.ps1 migrate
#      .\manage.ps1 makemigrations
param(
    [Parameter(ValueFromRemainingArguments=$true)]
    $Arguments
)

if ($Arguments.Count -eq 0) {
    Write-Host "Uso: .\manage.ps1 <comando> [opcoes]"
    Write-Host "Exemplos:"
    Write-Host "  .\manage.ps1 runserver"
    Write-Host "  .\manage.ps1 migrate"
    Write-Host "  .\manage.ps1 makemigrations"
    exit 1
}

& .\.venv\Scripts\python.exe manage.py @Arguments
