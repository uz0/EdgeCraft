#!/usr/bin/env python3
"""
Generate simple placeholder GLB models for EdgeCraft
These are minimal, valid glTF 2.0 binary files that can be replaced later.

CC0 1.0 License - Public Domain
"""

import struct
import json
import base64

def create_box_glb(name, color=(0.8, 0.4, 0.2), size=2.0):
    """
    Create a simple box GLB file programmatically.

    Args:
        name: Model name
        color: RGB color tuple (0-1 range)
        size: Box size

    Returns:
        bytes: GLB binary data
    """

    # Box vertices (8 corners)
    s = size / 2
    vertices = [
        -s, -s, -s,  # 0
         s, -s, -s,  # 1
         s,  s, -s,  # 2
        -s,  s, -s,  # 3
        -s, -s,  s,  # 4
         s, -s,  s,  # 5
         s,  s,  s,  # 6
        -s,  s,  s,  # 7
    ]

    # Box indices (12 triangles, 2 per face)
    indices = [
        # Front
        0, 1, 2, 2, 3, 0,
        # Back
        5, 4, 7, 7, 6, 5,
        # Top
        3, 2, 6, 6, 7, 3,
        # Bottom
        4, 5, 1, 1, 0, 4,
        # Right
        1, 5, 6, 6, 2, 1,
        # Left
        4, 0, 3, 3, 7, 4,
    ]

    # Normals (one per face, duplicated for each vertex)
    normals = [
         0,  0, -1,  # Front
         0,  0, -1,
         0,  0, -1,
         0,  0, -1,
         0,  0,  1,  # Back
         0,  0,  1,
         0,  0,  1,
         0,  0,  1,
    ]

    # Pack vertex data into binary
    vertex_data = struct.pack(f'{len(vertices)}f', *vertices)
    indices_data = struct.pack(f'{len(indices)}H', *indices)
    normals_data = struct.pack(f'{len(normals)}f', *normals)

    # Combine all binary data
    binary_data = vertex_data + normals_data + indices_data

    # Pad to 4-byte alignment
    padding_length = (4 - len(binary_data) % 4) % 4
    binary_data += b'\x00' * padding_length

    # Create glTF JSON
    gltf_json = {
        "asset": {
            "version": "2.0",
            "generator": "EdgeCraft Procedural Generator",
            "copyright": "CC0 1.0 - Public Domain"
        },
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0, "name": name}],
        "meshes": [{
            "name": name,
            "primitives": [{
                "attributes": {
                    "POSITION": 0,
                    "NORMAL": 1
                },
                "indices": 2,
                "material": 0
            }]
        }],
        "accessors": [
            {
                "bufferView": 0,
                "componentType": 5126,  # FLOAT
                "count": len(vertices) // 3,
                "type": "VEC3",
                "max": [s, s, s],
                "min": [-s, -s, -s]
            },
            {
                "bufferView": 1,
                "componentType": 5126,  # FLOAT
                "count": len(normals) // 3,
                "type": "VEC3"
            },
            {
                "bufferView": 2,
                "componentType": 5123,  # UNSIGNED_SHORT
                "count": len(indices),
                "type": "SCALAR"
            }
        ],
        "bufferViews": [
            {
                "buffer": 0,
                "byteOffset": 0,
                "byteLength": len(vertex_data),
                "target": 34962  # ARRAY_BUFFER
            },
            {
                "buffer": 0,
                "byteOffset": len(vertex_data),
                "byteLength": len(normals_data),
                "target": 34962  # ARRAY_BUFFER
            },
            {
                "buffer": 0,
                "byteOffset": len(vertex_data) + len(normals_data),
                "byteLength": len(indices_data),
                "target": 34963  # ELEMENT_ARRAY_BUFFER
            }
        ],
        "buffers": [{
            "byteLength": len(binary_data)
        }],
        "materials": [{
            "name": f"{name}_material",
            "pbrMetallicRoughness": {
                "baseColorFactor": [color[0], color[1], color[2], 1.0],
                "metallicFactor": 0.0,
                "roughnessFactor": 0.8
            }
        }]
    }

    # Convert JSON to bytes
    json_data = json.dumps(gltf_json, separators=(',', ':')).encode('utf-8')

    # Pad JSON to 4-byte alignment
    json_padding = (4 - len(json_data) % 4) % 4
    json_data += b' ' * json_padding

    # GLB header
    magic = 0x46546C67  # "glTF"
    version = 2
    total_length = 12 + 8 + len(json_data) + 8 + len(binary_data)

    # JSON chunk header
    json_chunk_length = len(json_data)
    json_chunk_type = 0x4E4F534A  # "JSON"

    # Binary chunk header
    bin_chunk_length = len(binary_data)
    bin_chunk_type = 0x004E4942  # "BIN\0"

    # Pack GLB file
    glb = struct.pack('<III', magic, version, total_length)
    glb += struct.pack('<II', json_chunk_length, json_chunk_type)
    glb += json_data
    glb += struct.pack('<II', bin_chunk_length, bin_chunk_type)
    glb += binary_data

    return glb


def create_cylinder_glb(name, color=(0.3, 0.6, 0.3), height=4.0, radius=0.5, segments=8):
    """
    Create a simple cylinder GLB file (for tree trunks).
    """
    import math

    vertices = []
    indices = []
    normals = []

    # Bottom center
    vertices.extend([0, 0, 0])
    normals.extend([0, -1, 0])

    # Top center
    vertices.extend([0, height, 0])
    normals.extend([0, 1, 0])

    # Bottom circle
    for i in range(segments):
        angle = 2 * math.pi * i / segments
        x = radius * math.cos(angle)
        z = radius * math.sin(angle)
        vertices.extend([x, 0, z])
        normals.extend([0, -1, 0])

    # Top circle
    for i in range(segments):
        angle = 2 * math.pi * i / segments
        x = radius * math.cos(angle)
        z = radius * math.sin(angle)
        vertices.extend([x, height, z])
        normals.extend([0, 1, 0])

    # Side vertices (with correct normals)
    for i in range(segments):
        angle = 2 * math.pi * i / segments
        x = radius * math.cos(angle)
        z = radius * math.sin(angle)
        nx = math.cos(angle)
        nz = math.sin(angle)

        vertices.extend([x, 0, z])
        normals.extend([nx, 0, nz])

        vertices.extend([x, height, z])
        normals.extend([nx, 0, nz])

    # Bottom cap triangles
    for i in range(segments):
        next_i = (i + 1) % segments
        indices.extend([0, 2 + next_i, 2 + i])

    # Top cap triangles
    for i in range(segments):
        next_i = (i + 1) % segments
        indices.extend([1, 2 + segments + i, 2 + segments + next_i])

    # Side triangles
    base_idx = 2 + 2 * segments
    for i in range(segments):
        next_i = (i + 1) % segments
        v0 = base_idx + i * 2
        v1 = base_idx + i * 2 + 1
        v2 = base_idx + next_i * 2
        v3 = base_idx + next_i * 2 + 1

        indices.extend([v0, v2, v1])
        indices.extend([v1, v2, v3])

    # Pack data (same as box)
    vertex_data = struct.pack(f'{len(vertices)}f', *vertices)
    indices_data = struct.pack(f'{len(indices)}H', *indices)
    normals_data = struct.pack(f'{len(normals)}f', *normals)

    binary_data = vertex_data + normals_data + indices_data
    padding_length = (4 - len(binary_data) % 4) % 4
    binary_data += b'\x00' * padding_length

    # Create glTF JSON (similar to box)
    gltf_json = {
        "asset": {
            "version": "2.0",
            "generator": "EdgeCraft Procedural Generator",
            "copyright": "CC0 1.0 - Public Domain"
        },
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0, "name": name}],
        "meshes": [{
            "name": name,
            "primitives": [{
                "attributes": {
                    "POSITION": 0,
                    "NORMAL": 1
                },
                "indices": 2,
                "material": 0
            }]
        }],
        "accessors": [
            {
                "bufferView": 0,
                "componentType": 5126,
                "count": len(vertices) // 3,
                "type": "VEC3",
                "max": [radius, height, radius],
                "min": [-radius, 0, -radius]
            },
            {
                "bufferView": 1,
                "componentType": 5126,
                "count": len(normals) // 3,
                "type": "VEC3"
            },
            {
                "bufferView": 2,
                "componentType": 5123,
                "count": len(indices),
                "type": "SCALAR"
            }
        ],
        "bufferViews": [
            {
                "buffer": 0,
                "byteOffset": 0,
                "byteLength": len(vertex_data),
                "target": 34962
            },
            {
                "buffer": 0,
                "byteOffset": len(vertex_data),
                "byteLength": len(normals_data),
                "target": 34962
            },
            {
                "buffer": 0,
                "byteOffset": len(vertex_data) + len(normals_data),
                "byteLength": len(indices_data),
                "target": 34963
            }
        ],
        "buffers": [{
            "byteLength": len(binary_data)
        }],
        "materials": [{
            "name": f"{name}_material",
            "pbrMetallicRoughness": {
                "baseColorFactor": [color[0], color[1], color[2], 1.0],
                "metallicFactor": 0.0,
                "roughnessFactor": 0.8
            }
        }]
    }

    json_data = json.dumps(gltf_json, separators=(',', ':')).encode('utf-8')
    json_padding = (4 - len(json_data) % 4) % 4
    json_data += b' ' * json_padding

    magic = 0x46546C67
    version = 2
    total_length = 12 + 8 + len(json_data) + 8 + len(binary_data)

    json_chunk_length = len(json_data)
    json_chunk_type = 0x4E4F534A

    bin_chunk_length = len(binary_data)
    bin_chunk_type = 0x004E4942

    glb = struct.pack('<III', magic, version, total_length)
    glb += struct.pack('<II', json_chunk_length, json_chunk_type)
    glb += json_data
    glb += struct.pack('<II', bin_chunk_length, bin_chunk_type)
    glb += binary_data

    return glb


if __name__ == "__main__":
    import os

    output_dir = "public/assets/models/doodads"
    os.makedirs(output_dir, exist_ok=True)

    # Create tree (brown cylinder)
    print("Generating tree_oak_01.glb...")
    tree_glb = create_cylinder_glb("tree_oak", color=(0.4, 0.3, 0.2), height=8.0, radius=0.3, segments=8)
    with open(f"{output_dir}/tree_oak_01.glb", "wb") as f:
        f.write(tree_glb)
    print(f"  ✅ Created {len(tree_glb)} bytes")

    # Create bush (green sphere-ish box)
    print("Generating bush_round_01.glb...")
    bush_glb = create_box_glb("bush_round", color=(0.2, 0.5, 0.2), size=1.5)
    with open(f"{output_dir}/bush_round_01.glb", "wb") as f:
        f.write(bush_glb)
    print(f"  ✅ Created {len(bush_glb)} bytes")

    # Create rock (gray box)
    print("Generating rock_large_01.glb...")
    rock_glb = create_box_glb("rock_large", color=(0.5, 0.5, 0.5), size=2.5)
    with open(f"{output_dir}/rock_large_01.glb", "wb") as f:
        f.write(rock_glb)
    print(f"  ✅ Created {len(rock_glb)} bytes")

    # Create placeholder box (magenta)
    print("Generating placeholder_box.glb...")
    placeholder_glb = create_box_glb("placeholder_box", color=(1.0, 0.0, 1.0), size=1.0)
    with open(f"{output_dir}/placeholder_box.glb", "wb") as f:
        f.write(placeholder_glb)
    print(f"  ✅ Created {len(placeholder_glb)} bytes")

    # Create marker (small yellow box)
    print("Generating marker_small.glb...")
    marker_glb = create_box_glb("marker_small", color=(1.0, 1.0, 0.0), size=0.5)
    with open(f"{output_dir}/marker_small.glb", "wb") as f:
        f.write(marker_glb)
    print(f"  ✅ Created {len(marker_glb)} bytes")

    # Create plant (green small cylinder)
    print("Generating plant_generic_01.glb...")
    plant_glb = create_cylinder_glb("plant_generic", color=(0.3, 0.6, 0.3), height=1.5, radius=0.2, segments=6)
    with open(f"{output_dir}/plant_generic_01.glb", "wb") as f:
        f.write(plant_glb)
    print(f"  ✅ Created {len(plant_glb)} bytes")

    print("\n✅ All GLB models generated successfully!")
    print("These are simple procedural models (CC0 Public Domain)")
    print("They can be replaced with higher-quality models later.")
