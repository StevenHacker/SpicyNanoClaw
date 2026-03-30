from __future__ import annotations

import argparse
from pathlib import Path

from dulwich import porcelain


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", default=".")
    parser.add_argument("--message", required=True)
    args = parser.parse_args()

    repo_path = Path(args.repo).resolve()
    if not (repo_path / ".git").exists():
        porcelain.init(str(repo_path))
    porcelain.add(str(repo_path), ".")
    porcelain.commit(str(repo_path), message=args.message.encode("utf-8"))
    print(f"checkpoint created in {repo_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

