"""
Build JSPen Studio into a standalone app with PyInstaller.

    python build_exe.py            # folder build: dist/JSPenStudio/JSPenStudio(.exe)  (recommended)
    python build_exe.py --onefile  # single file: dist/JSPenStudio(.exe) (slower start: unpacks QtWebEngine)
    python build_exe.py --check    # only verify the environment

Runs PyInstaller through `python -m PyInstaller`, so it works even when the
`pyinstaller` command is not on PATH, and uses the right --add-data separator
for the current OS (';' on Windows, ':' elsewhere).
"""

import argparse
import importlib.util
import os
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
NAME = "JSPenStudio"
DATA = [("index.html", "."), ("css", "css"), ("js", "js"), ("templates", "templates")]


def fail(msg):
    print(f"[오류] {msg}")
    sys.exit(1)


def check_environment():
    if sys.version_info < (3, 9):
        fail(f"Python 3.9 이상이 필요합니다 (현재 {sys.version.split()[0]}).")
    missing = [m for m in ("PyQt6", "PyQt6.QtWebEngineWidgets", "PyInstaller") if importlib.util.find_spec(m) is None]
    if missing:
        fail("필요한 패키지가 없습니다: " + ", ".join(missing) +
             f"\n  설치: \"{sys.executable}\" -m pip install -r requirements.txt pyinstaller")
    for src, _ in DATA:
        if not os.path.exists(os.path.join(ROOT, src)):
            fail(f"빌드에 필요한 파일이 없습니다: {src}")
    print(f"Python {sys.version.split()[0]} / PyInstaller OK / PyQt6 OK")


# Qt parts this app never uses (removed after a folder build to save space).
UNUSED_QT_LIBS = ("Qt6Quick3D", "Qt6QuickControls2", "Qt6QuickDialogs2", "Qt6QuickTimeline", "Qt6QuickParticles",
                  "Qt6QuickTest", "Qt6QuickVectorImage", "Qt6Multimedia", "Qt6SpatialAudio", "Qt6ShaderTools",
                  "Qt6Pdf", "Qt6Sensors", "Qt63D")  # Qt6Positioning: linked by QtWebEngineCore
KEEP_LANGS = ("ko", "en")


def prune(dist_dir):
    """Drop unused Qt libraries/QML modules and translations other than ko/en."""
    removed = 0
    for root, dirs, files in os.walk(dist_dir, topdown=False):
        for f in files:
            path = os.path.join(root, f)
            base = f.split(".")[0]
            lang_file = "translations" in path.replace("\\", "/").split("/")
            drop = any(base.startswith(lib) or base.startswith("lib" + lib) for lib in UNUSED_QT_LIBS)
            if lang_file and f.endswith((".qm", ".pak")):
                stem = f.rsplit(".", 1)[0]
                drop = not any(stem == l or stem.endswith("_" + l) or stem.startswith(l + "-") or stem.startswith(l + "_")
                               for l in KEEP_LANGS)
            if drop:
                # PyInstaller also places symlinks to the Qt libraries; they may
                # already be dangling once their target is removed.
                if not os.path.islink(path):
                    removed += os.path.getsize(path)
                os.remove(path)
        for d in dirs:
            if d in ("QtQuick3D", "Qt3D", "QtMultimedia", "QtQuickControls2"):
                p = os.path.join(root, d)
                if os.path.isdir(p):
                    removed += sum(os.path.getsize(os.path.join(a, x)) for a, _, fs in os.walk(p) for x in fs
                                   if not os.path.islink(os.path.join(a, x)))
                    shutil.rmtree(p, ignore_errors=True)
    print(f"불필요한 Qt 파일 정리: {removed / 1024 / 1024:.0f} MB")


def selftest(exe):
    """Launch the build with --selftest (loads the studio, checks it, exits)."""
    print("빌드 자체 점검 중... (창이 잠깐 열렸다 닫힙니다)")
    try:
        r = subprocess.run([exe, "--selftest"], capture_output=True, text=True, timeout=120)
    except subprocess.TimeoutExpired:
        fail("자체 점검 시간 초과")
    line = next((l for l in (r.stdout + r.stderr).splitlines() if l.startswith("JSPEN_SELFTEST")), "")
    print(line or "(점검 결과 없음)")
    if r.returncode != 0:
        fail("빌드 결과물이 정상 실행되지 않았습니다. 위 점검 결과를 확인하세요.\n"
             "  Qt 파일 정리 때문일 수 있습니다: python build_exe.py --no-prune 로 다시 빌드해 보세요.")
    print("자체 점검 통과")


def build(onefile, do_prune=True):
    sep = ";" if os.name == "nt" else ":"
    cmd = [sys.executable, "-m", "PyInstaller", "--noconfirm", "--clean", "--windowed", "--name", NAME,
           "--onefile" if onefile else "--onedir"]
    for src, dst in DATA:
        cmd += ["--add-data", f"{os.path.join(ROOT, src)}{sep}{dst}"]
    # PyInstaller's PyQt6 hooks collect QtWebEngine (helper process, resources, locales).
    cmd += ["--hidden-import", "PyQt6.QtWebChannel"]
    cmd.append(os.path.join(ROOT, "main.py"))
    print("실행:", " ".join(f'"{c}"' if " " in c else c for c in cmd))
    for d in ("build", os.path.join("dist", NAME)):
        shutil.rmtree(os.path.join(ROOT, d), ignore_errors=True)
    result = subprocess.run(cmd, cwd=ROOT)
    if result.returncode != 0:
        fail("PyInstaller 빌드에 실패했습니다. 위 로그를 확인하세요.")
    exe = NAME + (".exe" if os.name == "nt" else "")
    out = os.path.join(ROOT, "dist", exe if onefile else os.path.join(NAME, exe))
    if not os.path.exists(out):
        fail(f"빌드 결과물을 찾을 수 없습니다: {out}")
    if not onefile and do_prune:
        prune(os.path.join(ROOT, "dist", NAME))
    print(f"\n[빌드 완료] {out}")
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--onefile", action="store_true", help="단일 실행 파일로 빌드")
    ap.add_argument("--check", action="store_true", help="환경만 확인")
    ap.add_argument("--no-selftest", action="store_true", help="빌드 후 자체 점검 생략")
    ap.add_argument("--no-prune", action="store_true", help="사용하지 않는 Qt 파일 정리 생략")
    args = ap.parse_args()
    check_environment()
    if not args.check:
        out = build(args.onefile, do_prune=not args.no_prune)
        if not args.no_selftest:
            selftest(out)


if __name__ == "__main__":
    main()
