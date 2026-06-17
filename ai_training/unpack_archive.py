from __future__ import annotations

import os
import shutil
import zipfile
import tarfile
from pathlib import Path


def safe_extract_zip(zip_path: Path, dest: Path) -> None:
    with zipfile.ZipFile(zip_path, 'r') as zf:
        for member in zf.namelist():
            member_path = dest / member
            if not str(member_path.resolve()).startswith(str(dest.resolve())):
                # skip potential path traversal
                continue
        zf.extractall(path=dest)


def safe_extract_tar(tar_path: Path, dest: Path) -> None:
    with tarfile.open(tar_path, 'r:*') as tf:
        for member in tf.getmembers():
            member_path = dest / member.name
            if not str(member_path.resolve()).startswith(str(dest.resolve())):
                continue
        tf.extractall(path=dest)


def unpack_recursive(src: Path, dest: Path) -> None:
    dest.mkdir(parents=True, exist_ok=True)
    if src.is_dir():
        # copy files into dest
        for p in src.iterdir():
            tgt = dest / p.name
            if p.is_dir():
                shutil.copytree(p, tgt, dirs_exist_ok=True)
            else:
                shutil.copy2(p, tgt)
                # check if archive
                if zipfile.is_zipfile(tgt) or tarfile.is_tarfile(tgt):
                    subdir = dest / (tgt.stem + "_unpacked")
                    try:
                        if zipfile.is_zipfile(tgt):
                            safe_extract_zip(tgt, subdir)
                        else:
                            safe_extract_tar(tgt, subdir)
                    except Exception:
                        pass
    else:
        # single file
        if zipfile.is_zipfile(src):
            safe_extract_zip(src, dest)
        elif tarfile.is_tarfile(src):
            safe_extract_tar(src, dest)
        else:
            # copy other file types
            shutil.copy2(src, dest / src.name)


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Recursively unpack an archive into a destination folder")
    parser.add_argument("src", type=str, help="Source archive or folder")
    parser.add_argument("dest", type=str, nargs="?", default="./unpacked_archive", help="Destination folder")
    args = parser.parse_args()

    src = Path(args.src).resolve()
    dest = Path(args.dest).resolve()
    print(f"Unpacking {src} -> {dest}")
    unpack_recursive(src, dest)
    print("Done")


if __name__ == '__main__':
    main()
