"""Exercise the production launcher with real servers and isolated storage."""

import json
import os
from pathlib import Path
import socket
import subprocess
import tempfile
import time
import unittest
from urllib.error import HTTPError, URLError
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parent.parent


def free_port():
    with socket.socket() as listener:
        listener.bind(("127.0.0.1", 0))
        return listener.getsockname()[1]


def response(port, path):
    try:
        with urlopen(f"http://127.0.0.1:{port}{path}", timeout=2) as result:
            return result.status, result.read().decode()
    except HTTPError as error:
        return error.code, error.read().decode()


class StartupTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory(prefix="sofathek-startup-")
        self.addCleanup(self.directory.cleanup)
        self.backend = free_port()
        self.frontend = free_port()
        while self.frontend == self.backend:
            self.frontend = free_port()
        self.env = {
            **os.environ,
            "SOFATHEK_BACKEND_PORT": str(self.backend),
            "SOFATHEK_FRONTEND_PORT": str(self.frontend),
            "VIDEOS_DIR": str(Path(self.directory.name) / "videos"),
            "TEMP_DIR": str(Path(self.directory.name) / "temp"),
        }
        self.log = tempfile.TemporaryFile(mode="w+")
        self.addCleanup(self.log.close)
        self.process = None

    def start(self):
        self.process = subprocess.Popen(
            ["bash", "scripts/start.sh"], cwd=ROOT, env=self.env,
            stdout=self.log, stderr=subprocess.STDOUT,
        )
        self.addCleanup(self.stop)

    def stop(self):
        if self.process and self.process.poll() is None:
            self.process.terminate()
            self.process.wait(timeout=30)

    def wait_ready(self):
        deadline = time.monotonic() + 20
        while time.monotonic() < deadline:
            if self.process.poll() is not None:
                self.log.seek(0)
                self.fail(f"Launcher exited: {self.log.read()}")
            try:
                if response(self.frontend, "/")[0] == 200:
                    return
            except (URLError, TimeoutError):
                pass
            time.sleep(0.1)
        self.fail("Frontend did not become ready")

    def assert_ports_closed(self):
        for port in (self.backend, self.frontend):
            with socket.socket() as connection:
                connection.settimeout(1)
                self.assertNotEqual(connection.connect_ex(("127.0.0.1", port)), 0)

    def test_degraded_health_still_serves_frontend_and_liveness(self):
        self.start()
        self.wait_ready()
        self.assertEqual(response(self.frontend, "/api/videos")[0], 200)
        os.rmdir(self.env["VIDEOS_DIR"])
        status, body = response(self.frontend, "/health")
        self.assertEqual(status, 503)
        self.assertEqual(json.loads(body)["status"], "critical")
        self.assertEqual(response(self.frontend, "/health/live")[0], 200)
        self.assertIn("Sofathek", response(self.frontend, "/")[1])
        self.stop()
        self.assertEqual(self.process.returncode, 0)
        self.assert_ports_closed()

    def test_duplicate_start_preserves_running_servers(self):
        self.start()
        self.wait_ready()
        duplicate = subprocess.run(
            ["bash", "scripts/start.sh"], cwd=ROOT, env=self.env,
            capture_output=True, text=True, timeout=10,
        )
        self.assertNotEqual(duplicate.returncode, 0)
        self.assertIn("occupied", duplicate.stderr)
        self.assertIsNone(self.process.poll())
        self.assertEqual(response(self.frontend, "/api/videos")[0], 200)

    def test_invalid_storage_fails_without_orphaned_servers(self):
        Path(self.env["VIDEOS_DIR"]).write_text("not a directory")
        self.start()
        self.assertNotEqual(self.process.wait(timeout=15), 0)
        self.assert_ports_closed()

    def test_backend_exit_stops_frontend_and_fails_launcher(self):
        self.start()
        self.wait_ready()
        pid = subprocess.check_output(
            ["lsof", "-t", f"-iTCP:{self.backend}", "-sTCP:LISTEN"],
            text=True, timeout=5,
        ).strip()
        os.kill(int(pid), 15)
        self.assertNotEqual(self.process.wait(timeout=20), 0)
        self.assert_ports_closed()

    def test_invalid_wait_timeout_is_rejected(self):
        result = subprocess.run(
            ["bash", "scripts/wait-for-it.sh", "http://127.0.0.1", "invalid"],
            cwd=ROOT, capture_output=True, text=True, timeout=5,
        )
        self.assertNotEqual(result.returncode, 0)

    def test_unresponsive_http_is_bounded(self):
        with socket.socket() as listener:
            listener.bind(("127.0.0.1", 0))
            listener.listen()
            port = listener.getsockname()[1]
            started = time.monotonic()
            result = subprocess.run(
                ["bash", "scripts/wait-for-it.sh", f"http://127.0.0.1:{port}", "2"],
                cwd=ROOT, capture_output=True, text=True, timeout=5,
            )
            self.assertNotEqual(result.returncode, 0)
            self.assertLess(time.monotonic() - started, 5)

    def test_invalid_ports_fail_before_launching_servers(self):
        self.env["SOFATHEK_BACKEND_PORT"] = "70000"
        self.start()
        self.assertNotEqual(self.process.wait(timeout=5), 0)
        self.assert_ports_closed()


if __name__ == "__main__":
    unittest.main(verbosity=2)
