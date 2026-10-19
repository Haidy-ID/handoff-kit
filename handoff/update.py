# Installs the latest release of the kit: downloads its zip and replaces this handoff/ folder with the one inside.
# Called by serve.py (POST /__handoff/update). Lives in handoff/ so it is updated with the kit.
import io
import json
import shutil
import urllib.request
import zipfile
from pathlib import Path

REPO = "Haidy-ID/handoff-kit"
KIT = Path(__file__).resolve().parent


def latest():
    req = urllib.request.Request(f"https://api.github.com/repos/{REPO}/releases/latest", headers={"Accept": "application/vnd.github+json"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.load(r)


def install():
    release = latest()
    with urllib.request.urlopen(release["zipball_url"], timeout=60) as r:
        archive = zipfile.ZipFile(io.BytesIO(r.read()))
    # The zip holds one root folder (<owner>-<repo>-<sha>/): only its handoff/ part is taken.
    root = archive.namelist()[0].split("/")[0]
    prefix = f"{root}/handoff/"
    staging = KIT.with_name("handoff.new")
    shutil.rmtree(staging, ignore_errors=True)
    for name in archive.namelist():
        if not name.startswith(prefix) or name.endswith("/"):
            continue
        target = (staging / name[len(prefix):]).resolve()
        # A path that leaves the staging folder (../, absolute) is refused: nothing is written outside handoff/.
        if not target.is_relative_to(staging.resolve()):
            shutil.rmtree(staging, ignore_errors=True)
            raise ValueError(f"Unsafe path in the release zip: {name}")
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(archive.read(name))
    if not (staging / "VERSION").is_file():
        shutil.rmtree(staging, ignore_errors=True)
        raise ValueError("The release zip has no handoff/VERSION")
    # Swap: the old folder is kept until the new one is in place, then removed.
    old = KIT.with_name("handoff.old")
    shutil.rmtree(old, ignore_errors=True)
    KIT.rename(old)
    staging.rename(KIT)
    shutil.rmtree(old, ignore_errors=True)
    return (KIT / "VERSION").read_text().strip()
