#!/usr/bin/env python3
"""
EdgeCraft FBX to GLB Converter
Batch converts Quaternius FBX models to GLB format for Babylon.js

Prerequisites:
  - Blender 3.0+ installed
  - Python 3.8+

Usage:
  1. Interactive mode (recommended):
     python3 scripts/convert-fbx-to-glb.py

  2. Direct mode:
     blender --background --python scripts/convert-fbx-to-glb.py -- \
       <input.fbx> <output.glb>

  3. Batch mode:
     python3 scripts/convert-fbx-to-glb.py --batch \
       public/assets/.downloads/quaternius-ultimate-nature/fbx/*.fbx

License: MIT
"""

import subprocess
import sys
import os
from pathlib import Path

# Blender executable paths (common locations)
BLENDER_PATHS = [
    "/Applications/Blender.app/Contents/MacOS/Blender",  # macOS
    "C:\\Program Files\\Blender Foundation\\Blender 3.6\\blender.exe",  # Windows
    "/usr/bin/blender",  # Linux (apt)
    "/snap/bin/blender",  # Linux (snap)
    "blender",  # In PATH
]


def find_blender():
    """Find Blender executable on system"""
    for path in BLENDER_PATHS:
        if os.path.exists(path):
            return path
        # Try running it (if in PATH)
        try:
            result = subprocess.run(
                [path, "--version"],
                capture_output=True,
                timeout=5
            )
            if result.returncode == 0:
                return path
        except (FileNotFoundError, subprocess.TimeoutExpired):
            continue

    return None


def convert_fbx_to_glb(fbx_path, glb_path, blender_exe):
    """Convert a single FBX file to GLB using Blender"""

    # Blender Python script for conversion
    blender_script = f"""
import bpy
import sys

# Clear default scene
bpy.ops.wm.read_factory_settings(use_empty=True)

# Import FBX
print(f"Importing FBX: {fbx_path}")
bpy.ops.import_scene.fbx(filepath="{fbx_path}")

# Select all objects
bpy.ops.object.select_all(action='SELECT')

# Export as GLB (glTF 2.0 binary)
print(f"Exporting GLB: {glb_path}")
bpy.ops.export_scene.gltf(
    filepath="{glb_path}",
    export_format='GLB',
    export_textures=True,
    export_materials='EXPORT',
    export_colors=True,
    export_cameras=False,
    export_lights=False,
    export_apply=True,
)

print("✅ Conversion complete!")
sys.exit(0)
"""

    # Write temporary Python script
    temp_script = Path("public/assets/.downloads/.blender_convert.py")
    temp_script.parent.mkdir(parents=True, exist_ok=True)
    temp_script.write_text(blender_script)

    # Run Blender in background mode
    print(f"Converting: {Path(fbx_path).name} → {Path(glb_path).name}")
    print("(This may take 10-30 seconds...)")

    try:
        result = subprocess.run(
            [
                blender_exe,
                "--background",
                "--python", str(temp_script)
            ],
            capture_output=True,
            text=True,
            timeout=60
        )

        if result.returncode == 0:
            print("✅ Success!")
            return True
        else:
            print(f"❌ Blender error:")
            print(result.stderr)
            return False

    except subprocess.TimeoutExpired:
        print("❌ Conversion timed out (>60s)")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    finally:
        # Clean up temp script
        if temp_script.exists():
            temp_script.unlink()


def interactive_mode(blender_exe):
    """Interactive CLI for selecting and converting models"""

    print("=" * 50)
    print("EdgeCraft FBX → GLB Converter (Interactive)")
    print("=" * 50)
    print("")

    # Find FBX files
    downloads_dir = Path("public/assets/.downloads")
    fbx_files = list(downloads_dir.rglob("*.fbx"))

    if not fbx_files:
        print("❌ No FBX files found in public/assets/.downloads/")
        print("   Please run: bash scripts/download-assets-phase1.sh")
        return False

    print(f"Found {len(fbx_files)} FBX models:")
    print("")

    # List models with indices
    for i, fbx in enumerate(fbx_files[:30], 1):  # Show first 30
        size_mb = fbx.stat().st_size / (1024 * 1024)
        print(f"  [{i:2d}] {fbx.name:<40} ({size_mb:.1f} MB)")

    print("")

    # Phase 1 needs: tree, bush, rock
    print("Phase 1 MVP needs 3 models:")
    print("  1. A tree (oak/generic)")
    print("  2. A bush/shrub")
    print("  3. A rock/boulder")
    print("")

    # Get user selections
    selections = {
        "tree_oak_01.glb": None,
        "bush_round_01.glb": None,
        "rock_large_01.glb": None,
    }

    for output_name, _ in selections.items():
        while True:
            try:
                prompt = f"Select #{i} for '{output_name}' (or 0 to skip): "
                choice = input(prompt).strip()

                if choice == "0":
                    print(f"  ⏭️  Skipping {output_name}")
                    break

                idx = int(choice)
                if 1 <= idx <= len(fbx_files):
                    selections[output_name] = fbx_files[idx - 1]
                    print(f"  ✅ {fbx_files[idx - 1].name} → {output_name}")
                    break
                else:
                    print(f"  ❌ Invalid choice (1-{len(fbx_files)})")

            except ValueError:
                print("  ❌ Please enter a number")
            except KeyboardInterrupt:
                print("\n❌ Cancelled")
                return False

    print("")

    # Perform conversions
    output_dir = Path("public/assets/models/doodads")
    output_dir.mkdir(parents=True, exist_ok=True)

    success_count = 0
    for output_name, fbx_path in selections.items():
        if fbx_path is None:
            continue

        output_path = output_dir / output_name
        print(f"\n[{success_count + 1}/3] Converting {output_name}...")

        if convert_fbx_to_glb(str(fbx_path), str(output_path), blender_exe):
            success_count += 1

    print("")
    print("=" * 50)
    print(f"Conversion Summary: {success_count}/3 models converted")
    print("=" * 50)

    if success_count == 3:
        print("✅ All models ready!")
        print("")
        print("Next steps:")
        print("  1. Verify assets: npm run validate-assets")
        print("  2. Test in browser: npm run dev")
        return True
    else:
        print("⚠️  Some conversions failed. Check errors above.")
        return False


def main():
    # Find Blender
    blender_exe = find_blender()

    if not blender_exe:
        print("❌ Blender not found!")
        print("")
        print("Please install Blender:")
        print("  - macOS: https://www.blender.org/download/")
        print("  - Windows: https://www.blender.org/download/")
        print("  - Linux: sudo apt install blender")
        print("")
        print("Or specify path manually:")
        print("  BLENDER=/path/to/blender python3 scripts/convert-fbx-to-glb.py")
        sys.exit(1)

    print(f"✅ Found Blender: {blender_exe}")
    print("")

    # Check for command-line arguments
    if len(sys.argv) > 1 and sys.argv[1] != "--background":
        # Direct mode: blender script arguments
        if len(sys.argv) != 3:
            print("Usage: python3 convert-fbx-to-glb.py <input.fbx> <output.glb>")
            sys.exit(1)

        fbx_path = sys.argv[1]
        glb_path = sys.argv[2]

        if convert_fbx_to_glb(fbx_path, glb_path, blender_exe):
            sys.exit(0)
        else:
            sys.exit(1)
    else:
        # Interactive mode
        if interactive_mode(blender_exe):
            sys.exit(0)
        else:
            sys.exit(1)


if __name__ == "__main__":
    main()
