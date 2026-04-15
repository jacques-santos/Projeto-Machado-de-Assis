from apps.catalog.models import Peca


def test_peca_str_returns_nome_obra():
    peca = Peca(nome_obra="Dom Casmurro")
    assert str(peca) == "Dom Casmurro"
