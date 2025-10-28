export type FileType = 'map' | 'image' | 'audio' | 'model' | 'code' | 'archive' | 'file';

export const getFileType = (fileName: string): FileType => {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? '';

  if (['w3x', 'w3m', 'sc2map', 'scx', 'scm', 'w3e', 'wpm', 'mmp'].includes(extension)) {
    return 'map';
  }

  if (['blp', 'tga', 'dds', 'png', 'jpg', 'jpeg', 'gif', 'bmp'].includes(extension)) {
    return 'image';
  }

  if (['wav', 'mp3', 'ogg', 'flac', 'w3s'].includes(extension)) {
    return 'audio';
  }

  if (['mdx', 'mdl', 'm3', 'gltf', 'glb', 'obj', 'fbx'].includes(extension)) {
    return 'model';
  }

  if (['lua', 'j', 'ai', 'js', 'ts', 'xml', 'json', 'txt', 'ini'].includes(extension)) {
    return 'code';
  }

  if (['w3n', 'mpq', 'zip', 'rar', '7z', 'sc2archive'].includes(extension)) {
    return 'archive';
  }

  return 'file';
};

export const getFileExtension = (fileName: string): string => {
  const extension = fileName.split('.').pop()?.toUpperCase() ?? '';
  return extension.length > 0 && extension.length < 6 ? extension : 'FILE';
};

// Legacy emoji icon support (deprecated, use FileType with SVG icons instead)
export const getFileIcon = (fileName: string): string => {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? '';

  const iconMap: Record<string, string> = {
    // Warcraft III files
    w3x: '🗺️',
    w3m: '🗺️',
    w3n: '📦',
    w3e: '🏔️',
    w3i: 'ℹ️',
    doo: '🏗️',
    w3u: '👤',
    w3t: '🔧',
    w3a: '⚔️',
    w3b: '📊',
    w3d: '💬',
    w3q: '🎯',
    w3c: '📋',
    w3s: '🔊',
    w3g: '🎮',
    w3f: '📁',

    // StarCraft II files
    sc2map: '🗺️',
    sc2mod: '🔧',
    sc2replay: '▶️',
    sc2archive: '📦',

    // Models and textures
    mdx: '🎭',
    mdl: '🎭',
    m3: '🎭',
    blp: '🖼️',
    tga: '🖼️',
    dds: '🖼️',
    jpg: '🖼️',
    jpeg: '🖼️',
    png: '🖼️',
    bmp: '🖼️',

    // Audio
    wav: '🔊',
    mp3: '🎵',
    ogg: '🎵',
    flac: '🎵',

    // Scripts
    j: '📜',
    ai: '🤖',
    lua: '📜',
    txt: '📄',
    xml: '📋',
    json: '📋',
    ini: '⚙️',

    // Archives
    mpq: '📦',
    zip: '📦',
    rar: '📦',
    '7z': '📦',

    // Other
    exe: '⚙️',
    dll: '🔌',
    sys: '🔌',
  };

  return iconMap[extension] ?? '📄';
};

export const getFileTypeDescription = (fileName: string): string => {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? '';

  const typeMap: Record<string, string> = {
    w3x: 'Warcraft III Expansion Map',
    w3m: 'Warcraft III Map',
    w3n: 'Warcraft III Campaign',
    w3e: 'Terrain Data',
    w3i: 'Map Information',
    doo: 'Doodad Placement',
    w3u: 'Unit Data',
    w3t: 'Trigger Data',
    w3a: 'Ability Data',
    w3b: 'Destructible Data',
    w3d: 'Dialogue Data',
    w3q: 'Quest Data',
    w3c: 'Camera Data',
    w3s: 'Sound Data',
    sc2map: 'StarCraft II Map',
    sc2mod: 'StarCraft II Mod',
    mdx: '3D Model (MDX)',
    mdl: '3D Model (MDL)',
    m3: '3D Model (M3)',
    blp: 'BLP Texture',
    wav: 'Audio File',
    mp3: 'MP3 Audio',
    txt: 'Text File',
    xml: 'XML Document',
    json: 'JSON Data',
    mpq: 'MPQ Archive',
  };

  return typeMap[extension] ?? 'Unknown File';
};
