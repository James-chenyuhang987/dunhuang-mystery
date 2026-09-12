#!/usr/bin/env python3
"""Build krpano-style multiresolution tiles for large equirectangular assets.

Small SVG demo panoramas are intentionally left alone: for those assets, one
request is cheaper than a tile set. The slicer accepts raster panoramas
(ffmpeg decodes JPEG/PNG/WebP); SVGs remain single-request assets because the
available ffmpeg build may not include an SVG decoder.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import tempfile
from pathlib import Path

from PIL import Image

DIMENSIONS = re.compile(r"(?:width=\"(?P<w>[0-9]+)(?:px)?\"[^>]*height=\"(?P<h>[0-9]+)(?:px)?\"|viewBox=\"[^\"]*\s(?P<vw>[0-9.]+)\s(?P<vh>[0-9.]+)\")")


def svg_dimensions(path: Path) -> tuple[int, int] | None:
    match = DIMENSIONS.search(path.read_text(encoding="utf-8", errors="ignore"))
    if not match:
        return None
    width = match.group("w") or match.group("vw")
    height = match.group("h") or match.group("vh")
    return round(float(width)), round(float(height))


def rasterize(source: Path, workdir: Path) -> Path:
    target = workdir / f"{source.stem}.png"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(source), "-frames:v", "1", str(target)], check=True)
    return target


def image_dimensions(source: Path) -> tuple[int, int] | None:
    if source.suffix.lower() == ".svg":
        return svg_dimensions(source)
    with Image.open(source) as image:
        return image.size


def is_equirectangular(source: Path) -> bool:
    dimensions = image_dimensions(source)
    return bool(dimensions and abs(dimensions[0] / dimensions[1] - 2) < 0.05)


def should_slice(source: Path, minimum_bytes: int, minimum_width: int, force: bool) -> bool:
    if source.suffix.lower() == ".svg":
        return False
    dimensions = image_dimensions(source)
    width = dimensions[0] if dimensions else 0
    if not is_equirectangular(source):
        return False
    return force or source.stat().st_size >= minimum_bytes or width >= minimum_width


def make_levels(image: Image.Image, tile_size: int) -> list[tuple[Image.Image, int]]:
    levels: list[tuple[Image.Image, int]] = []
    current = image
    while True:
        levels.append((current, current.width))
        if current.width <= tile_size * 2:
            break
        width = max(tile_size * 2, current.width // 2)
        current = current.resize((width, max(1, round(width / 2))), Image.Resampling.LANCZOS)
    return list(reversed(levels))


def slice_panorama(source: Path, output_root: Path, tile_size: int, workdir: Path) -> dict:
    raster = rasterize(source, workdir)
    with Image.open(raster) as opened:
        image = opened.convert("RGB")
    levels = []
    for level_image, width in make_levels(image, tile_size):
        level_dir = output_root / source.stem / str(width)
        level_dir.mkdir(parents=True, exist_ok=True)
        cols = (level_image.width + tile_size - 1) // tile_size
        rows = (level_image.height + tile_size - 1) // tile_size
        for y in range(rows):
            for x in range(cols):
                box = (x * tile_size, y * tile_size, min((x + 1) * tile_size, level_image.width), min((y + 1) * tile_size, level_image.height))
                level_image.crop(box).save(level_dir / f"{x}-{y}.webp", "WEBP", quality=82, method=6)
        levels.append({"width": level_image.width, "height": level_image.height, "cols": cols, "rows": rows, "path": str(level_dir.relative_to(output_root))})
    manifest = {"source": source.name, "tileSize": tile_size, "levels": levels}
    (output_root / source.stem / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return manifest


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=Path("public/art"))
    parser.add_argument("--output", type=Path, default=Path("public/panorama-tiles"))
    parser.add_argument("--tile-size", type=int, default=1024)
    parser.add_argument("--min-bytes", type=int, default=256 * 1024)
    parser.add_argument("--min-width", type=int, default=4096)
    parser.add_argument("--force", action="store_true", help="tile every supported image, including small demo assets")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    sources = sorted(p for p in args.source.iterdir() if p.suffix.lower() in {".svg", ".jpg", ".jpeg", ".png", ".webp"})
    args.output.mkdir(parents=True, exist_ok=True)
    selected = [p for p in sources if should_slice(p, args.min_bytes, args.min_width, args.force)]
    print(f"Found {len(sources)} image assets; selected {len(selected)} for tiling.")
    for source in sources:
        if source not in selected:
            print(f"skip {source} (small single-request asset)")
    if args.dry_run:
        return 0
    with tempfile.TemporaryDirectory(prefix="panorama-tiles-") as temporary:
        for source in selected:
            manifest = slice_panorama(source, args.output, args.tile_size, Path(temporary))
            print(f"wrote {source} ({len(manifest['levels'])} levels)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
