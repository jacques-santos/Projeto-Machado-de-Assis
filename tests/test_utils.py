"""
Testes para funções utilitárias de sanitização.
"""

import pytest
from apps.catalog.utils import (
    sanitize_html_value,
    escape_html,
    strip_html,
    normalize_text,
    get_display_value,
)


class TestSanitizeHtmlValue:
    """Testes para sanitize_html_value"""
    
    def test_removes_html_tags(self):
        """Deve remover tags HTML"""
        assert sanitize_html_value('<div>Texto</div>') == 'Texto'
        assert sanitize_html_value('<p>Cleópatra</p>') == 'Cleópatra'
        assert sanitize_html_value('<font color="red">Vermelho</font>') == 'Vermelho'
    
    def test_decodes_html_entities(self):
        """Deve decodificar entidades HTML"""
        assert sanitize_html_value('&quot;Cleópatra&quot;') == '"Cleópatra"'
        assert sanitize_html_value('Escravo&nbsp;Rainha') == 'Escravo Rainha'
        assert sanitize_html_value('Tom&apos;s') == "Tom's"
        assert sanitize_html_value('&lt;&gt;') == '<>'
    
    def test_handles_null_values(self):
        """Deve retornar None para valores vazios/null"""
        assert sanitize_html_value(None) is None
        assert sanitize_html_value('') is None
        assert sanitize_html_value('None') is None
        assert sanitize_html_value('   ') is None
    
    def test_removes_multiple_spaces(self):
        """Deve normalizar espaços múltiplos"""
        assert sanitize_html_value('Texto   com    espaços') == 'Texto com espaços'
        assert sanitize_html_value('   Inicio') == 'Inicio'
        assert sanitize_html_value('Fim   ') == 'Fim'
    
    def test_complex_case(self):
        """Caso complexo com HTML e entidades"""
        input_text = '&quot;Cleópatra&quot;<div class="ignore">lixo</div>Escravo&nbsp;e&nbsp;Rainha'
        expected = '"Cleópatra"lixoEscravo e Rainha'
        assert sanitize_html_value(input_text) == expected


class TestEscapeHtml:
    """Testes para escape_html"""
    
    def test_escapes_angle_brackets(self):
        """Deve escapar < e >"""
        assert escape_html('<script>') == '&lt;script&gt;'
        assert escape_html('<div>') == '&lt;div&gt;'
    
    def test_escapes_quotes(self):
        """Deve escapar aspas"""
        assert escape_html('He said "hello"') == 'He said &quot;hello&quot;'
        assert escape_html("It's") == "It&#39;s"
    
    def test_escapes_ampersand(self):
        """Deve escapar &"""
        assert escape_html('Tom & Jerry') == 'Tom &amp; Jerry'
    
    def test_xss_prevention(self):
        """Deve bloquear XSS"""
        assert escape_html('<script>alert("xss")</script>') == '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'


class TestStripHtml:
    """Testes para strip_html"""
    
    def test_removes_tags_keeps_entities(self):
        """Deve remover tags mas manter entidades"""
        assert strip_html('<div>Cleópatra&nbsp;texto</div>') == 'Cleópatra&nbsp;texto'
        assert strip_html('<p>Texto</p>') == 'Texto'
    
    def test_handles_null(self):
        """Deve lidar com None"""
        assert strip_html(None) == ''
        assert strip_html('') == ''


class TestNormalizeText:
    """Testes para normalize_text"""
    
    def test_removes_accents(self):
        """Deve remover acentos"""
        assert normalize_text('Café') == 'cafe'
        assert normalize_text('Açúcar') == 'acucar'
    
    def test_to_lowercase(self):
        """Deve converter para minúsculas"""
        assert normalize_text('TEXTO') == 'texto'
        assert normalize_text('TeXtO') == 'texto'
    
    def test_strips_whitespace(self):
        """Deve remover espaços"""
        assert normalize_text('  Texto  ') == 'texto'


class TestGetDisplayValue:
    """Testes para get_display_value"""
    
    def test_shows_blank_for_none(self):
        """Deve mostrar '(Em Branco)' para None"""
        assert get_display_value(None) == '(Em Branco)'
        assert get_display_value('None') == '(Em Branco)'
        assert get_display_value('') == '(Em Branco)'
    
    def test_sanitizes_and_displays(self):
        """Deve sanitizar antes de exibir"""
        assert get_display_value('&quot;Cleópatra&quot;') == '"Cleópatra"'
        assert get_display_value('<div>Texto</div>') == 'Texto'
