"""
Utilidades centralizadas para sanitização e processamento de dados.
Usadas em backend e exportadas para frontend para garantir consistência.
"""

import html as html_mod
import re
from typing import Optional
import logging

logger = logging.getLogger(__name__)


def sanitize_html_value(value: Optional[str]) -> Optional[str]:
    """
    Remove tags HTML e decodifica entidades HTML comuns.
    Usada em backend (Python) e frontend (JavaScript).
    
    Garante consistência entre Python e JavaScript.
    
    Exemplos:
        "&quot;Cleópatra&quot;" → "Cleópatra"
        "Escravo&nbsp;Rainha<div>lixo</div>" → "Escravo Rainha lixo"
        None → None
        "" → None
        "None" → None
    
    Args:
        value: Valor a ser sanitizado
    
    Returns:
        Valor limpo ou None se vazio/null
    """
    if not value or value == 'None':
        return None
    
    text = str(value).strip()
    
    if not text:
        return None
    
    # Remove tags HTML (<div>, <font>, etc)
    text = re.sub(r'<[^>]*>', '', text)
    
    # Decodifica TODAS as entidades HTML (&Agrave;, &Ecirc;, &#39; etc.)
    text = html_mod.unescape(text)
    
    # Normaliza espaços múltiplos
    text = re.sub(r'\s+', ' ', text).strip()
    
    return text if text else None


def escape_html(text: str) -> str:
    """
    Escapa caracteres perigosos para HTML.
    Usado antes de inserir dados em HTML.
    
    Exemplos:
        '<script>alert("xss")</script>' → '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
        'texto "normal"' → 'texto &quot;normal&quot;'
    
    Args:
        text: Texto a ser escapado
    
    Returns:
        Texto escapado
    """
    return (
        str(text or '')
        .replace('&', '&amp;')
        .replace('<', '&lt;')
        .replace('>', '&gt;')
        .replace('"', '&quot;')
        .replace("'", '&#39;')
    )


def strip_html(text: str) -> str:
    """
    Remove apenas tags HTML, mantendo entidades.
    
    Exemplos:
        '<div>Cleópatra</div>' → 'Cleópatra'
        'Texto&nbsp;com&nbsp;espaços' → 'Texto&nbsp;com&nbsp;espaços'
    
    Args:
        text: Texto com HTML
    
    Returns:
        Texto sem tags, mas com entidades
    """
    return re.sub(r'<[^>]*>', '', str(text or ''))


def normalize_text(text: str) -> str:
    """
    Normaliza texto removendo acentos e convertendo para lowercase.
    Usado em buscas case-insensitive.
    
    Args:
        text: Texto a normalizar
    
    Returns:
        Texto normalizado
    """
    import unicodedata
    
    text = str(text or '').strip().lower()
    text = unicodedata.normalize('NFD', text)
    text = ''.join(c for c in text if unicodedata.category(c) != 'Mn')
    return text


def get_display_value(value: Optional[str]) -> str:
    """
    Retorna o valor pronto para exibição em filtros.
    Trata valores especiais como None/Em Branco.
    
    Args:
        value: Valor do banco
    
    Returns:
        Valor formatado para exibição
    """
    if value is None or value == 'None' or value == '':
        return '(Em Branco)'
    
    return sanitize_html_value(value) or '(Em Branco)'
