#!/usr/bin/env python
import os
import django
import unicodedata
import psycopg

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection

def remove_accents(text):
    """Remove accents from characters"""
    nfkd_form = unicodedata.normalize('NFKD', text)
    return ''.join([c for c in nfkd_form if not unicodedata.combining(c)])

def check_columns():
    """Check columns in all tables for accents or special characters"""
    with connection.cursor() as cursor:
        # Get all columns from catalog app tables
        tables = [
            'tblassinatura', 'tblgenero', 'tblinstanciaocorrenciacaso',
            'tbllivro', 'tbllocalpublicacao', 'tblmidia', 'tblpeca', 
            'tbltecnicaassinatura'
        ]
        
        alterations = []
        
        for table in tables:
            cursor.execute(f"""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = '{table}'
                ORDER BY ordinal_position
            """)
            
            columns = cursor.fetchall()
            print(f"\n📋 Tabela: {table}")
            print("-" * 60)
            
            for col_tuple in columns:
                col_name = col_tuple[0]
                clean_name = remove_accents(col_name).lower()
                
                if col_name != clean_name:
                    print(f"  ⚠️  {col_name:30} → {clean_name}")
                    alterations.append({
                        'table': table,
                        'old_name': col_name,
                        'new_name': clean_name
                    })
                else:
                    print(f"  ✅ {col_name}")
        
        return alterations

def generate_alter_script(alterations):
    """Generate ALTER TABLE script"""
    script = "-- Script para remover acentos das colunas\n\n"
    
    for alt in alterations:
        script += f'ALTER TABLE "{alt["table"]}" RENAME COLUMN "{alt["old_name"]}" TO "{alt["new_name"]}";\n'
    
    return script

if __name__ == '__main__':
    print("🔍 Verificando colunas com acentos e caracteres especiais...\n")
    alterations = check_columns()
    
    if alterations:
        print("\n" + "=" * 60)
        print("📝 Script SQL para renomear colunas:\n")
        script = generate_alter_script(alterations)
        print(script)
        
        # Save to file
        with open('fix_columns.sql', 'w', encoding='utf-8') as f:
            f.write(script)
        print("✅ Script salvo em fix_columns.sql")
    else:
        print("\n✅ Nenhuma coluna com acentos encontrada!")
