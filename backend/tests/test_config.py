import pytest

from src import config


def test_port_defaults_when_unset(monkeypatch):
    monkeypatch.delenv("PORT", raising=False)

    assert config._read_port() == config.DEFAULT_PORT == 8002


def test_port_defaults_when_empty(monkeypatch):
    monkeypatch.setenv("PORT", " ")

    assert config._read_port() == 8002


def test_port_is_read_from_environment(monkeypatch):
    monkeypatch.setenv("PORT", "9000")

    assert config._read_port() == 9000


def test_invalid_port_is_rejected(monkeypatch):
    monkeypatch.setenv("PORT", "eighty")

    with pytest.raises(ValueError, match="PORT must be a number"):
        config._read_port()
