from types import SimpleNamespace

from apps.catalog.permissions import IsAdminOrReadOnly


class DummyRequest(SimpleNamespace):
    pass


class DummyUser(SimpleNamespace):
    pass


def test_read_is_public():
    permission = IsAdminOrReadOnly()
    request = DummyRequest(method="GET", user=DummyUser(is_authenticated=False, is_staff=False))
    assert permission.has_permission(request, None) is True


def test_write_requires_staff():
    permission = IsAdminOrReadOnly()
    request = DummyRequest(method="POST", user=DummyUser(is_authenticated=True, is_staff=False))
    assert permission.has_permission(request, None) is False


def test_write_allowed_for_staff():
    permission = IsAdminOrReadOnly()
    request = DummyRequest(method="PATCH", user=DummyUser(is_authenticated=True, is_staff=True))
    assert permission.has_permission(request, None) is True
