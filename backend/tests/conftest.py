import os

import pytest
from fastapi.testclient import TestClient

# src.config reads these at import time; tests never call the real services.
os.environ.setdefault("ANNOTATION_API_V2", "http://annoq.test/graphql")
os.environ.setdefault("ANNOTATION_DOWNLOAD_V2", "http://annoq.test/download")
os.environ.setdefault("ANNOQ_RSID_FIELD", "rs_dbSNP151")
os.environ.setdefault("ANNOQ_SITE_URL", "http://annoq-site.test")
os.environ.setdefault("GA_MEASUREMENT_ID", "test")
os.environ.setdefault("GA_API_SECRET", "test")


@pytest.fixture(scope="session")
def main_module(tmp_path_factory):
    # main.py mounts ./dist at import time, so import it from a folder that has one.
    static_root = tmp_path_factory.mktemp("static_root")
    (static_root / "dist").mkdir()
    cwd = os.getcwd()
    os.chdir(static_root)
    try:
        import main
    finally:
        os.chdir(cwd)
    return main


@pytest.fixture
def client(main_module, monkeypatch):
    async def _no_op_send_event(*args, **kwargs):
        return None

    async def _no_op_load_annoq_metadata():
        return None

    monkeypatch.setattr(main_module, "send_event", _no_op_send_event)
    # Runs would otherwise read AnnoQ's versions from AnnoQ; tests that need
    # versions set annoq.annoq_data_versions and annoq.annotator_versions.
    monkeypatch.setattr(
        main_module.annoq, "load_annoq_metadata", _no_op_load_annoq_metadata
    )
    return TestClient(main_module.app)
