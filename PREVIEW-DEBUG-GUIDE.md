# Map Preview Debug Guide - "3P Sentinel 01 v3.06.w3x"

## Expected Flow

### 1. App Loads (App.tsx lines 139-250)
```
✅ Dev server at http://localhost:3001/
✅ 24 maps loaded from hardcoded MAP_LIST
✅ Preview generation starts in background useEffect
```

### 2. Map File Loading (App.tsx lines 172-229)
```
Console output expected:
[App] Fetching map file: /maps/3P%20Sentinel%2001%20v3.06.w3x
[App] ✅ Fetched 3P Sentinel 01 v3.06.w3x, size: 10850455 bytes
```

**Check:** Open browser DevTools (F12) → Console. You should see these messages.

### 3. Map Parsing (App.tsx lines 211-221)
```
W3XMapLoader.parse() is called
MPQParser reads the MPQ archive structure
Terrain, units, and info are extracted

Console output expected:
[MPQParser] readHashTable: ...
[MPQParser] readBlockTable: ...
[MPQParser] findFile: war3map.w3i
[MPQParser] findFile: war3map.w3e
[MPQParser] findFile: war3mapUnits.doo
```

**Known Issue:** W3X files use multi-compression (0x15 = Huffman+BZip2) which is NOT YET IMPLEMENTED.
This means:
- ✅ Archive structure is parsed correctly
- ❌ Individual files CANNOT be extracted
- ❌ `war3map.w3i`, `war3map.w3e`, etc. extraction will FAIL

**Expected Error:**
```
Error: Multi-compression not supported (flags: 0x15). File: war3map.w3i
```

### 4. Preview Generation (useMapPreviews.ts lines 72-139)
```
MapPreviewExtractor.extract() is called
  → Try embedded extraction first (will fail due to multi-compression)
  → Fall back to MapPreviewGenerator.generatePreview()

Console output expected:
[MapPreviewExtractor] extract() called for: 3P Sentinel 01 v3.06.w3x
[MapPreviewExtractor] Trying embedded extraction for: 3P Sentinel 01 v3.06.w3x
[MPQParser] findFile: war3mapPreview.tga
❌ [MapPreviewExtractor] Embedded extraction failed: Multi-compression not supported...

[MapPreviewExtractor] Generating preview for: 3P Sentinel 01 v3.06.w3x
[MapPreviewGenerator] generatePreview() called, map dimensions: ...
[MapPreviewGenerator] Creating Babylon.js Engine...
[MapPreviewGenerator] ✅ Engine created, WebGL version: 2
[MapPreviewGenerator] Step 1: Creating Babylon.js scene...
[MapPreviewGenerator] Step 3: Rendering terrain...
[MapPreviewGenerator] Step 5: Rendering frame...
[MapPreviewGenerator] Step 6: Capturing screenshot...
[MapPreviewGenerator] ✅ Preview generation complete in XXXms
```

### 5. Preview Display
```
useMapPreviews hook stores the preview in a Map<string, string>
App.tsx merges previews with maps (lines 306-320)
MapGallery displays the <img src={thumbnailUrl} />
```

## Current Issue Diagnosis

### Problem 1: Multi-Compression Not Supported
**Status:** KNOWN LIMITATION (documented in previous session)
**Impact:** W3X maps CANNOT extract embedded `war3mapPreview.tga`
**Workaround:** MUST use fallback generated preview

**But:** If map parsing itself fails (due to not being able to extract war3map.w3i/w3map.w3e), then `mapData` will be invalid/incomplete, and preview generation will also fail.

### Problem 2: Map Parsing Likely Fails
**Check browser console for:**
```
❌ Failed to load 3P Sentinel 01 v3.06.w3x for preview: Multi-compression not supported
```

If you see this, it means `mapDataMap.get('3P Sentinel 01 v3.06.w3x')` is `undefined`, so `useMapPreviews` skips it (line 104-107).

### Problem 3: Preview Not Displayed
**If preview WAS generated but not displayed, check:**
1. Browser console for `[useMapPreviews] Setting previews Map, size: X`
2. Browser console for `[App] Merging previews - previews Map size: X`
3. Browser console for `[App] Map "3P Sentinel 01 v3.06.w3x" -> thumbnailUrl: HAS URL` vs `NO URL`

## Action Required

### Open Browser Console (F12) and look for:

1. **Map fetching errors?**
   - Search for: `Failed to fetch 3P Sentinel`
   - If yes: Check `/maps/` symlink and file permissions

2. **Map parsing errors?**
   - Search for: `Multi-compression not supported`
   - If yes: W3X decompression not yet implemented (EXPECTED)
   - Search for: `Failed to load 3P Sentinel 01 v3.06.w3x for preview`
   - If yes: Map parsing failed, no `mapData` available

3. **Preview generation errors?**
   - Search for: `[MapPreviewGenerator]`
   - Look for: `Engine created` (should see WebGL version 2)
   - Look for: `Preview generation complete` (with timing)

4. **Preview display errors?**
   - Search for: `[App] Merging previews`
   - Check if: `thumbnailUrl: HAS URL` or `NO URL`

## Expected Root Cause

**Most Likely:** Map parsing fails for W3X maps because:
- `war3map.w3i` (map info) cannot be extracted → no `mapData.info`
- `war3map.w3e` (terrain) cannot be extracted → no `mapData.terrain`
- Without valid `mapData`, preview generation cannot run

**Solution:** Implement multi-compression decompression:
1. Implement ZLIB decompression
2. Implement BZip2 decompression
3. Implement Huffman decompression
4. Implement multi-algorithm pipeline (0x15 = decompress with Huffman THEN BZip2)

## Quick Test for SC2 Maps (Should Work)

SC2 maps use LZMA compression (0x12) which might be supported.

**In browser console, search for:**
```
"Aliens Binary Mothership.SC2Map"
```

**Expected:**
- ✅ Map fetched
- ✅ Map parsed (SC2MapLoader)
- ✅ Embedded preview extracted from `PreviewImage.tga` (TGA decoder)
- ✅ Preview displayed

**If SC2 previews work:** The system is functional, just W3X multi-compression is missing.
**If SC2 previews don't work:** There's a broader issue (check console for errors).

## Next Steps

1. **User:** Open http://localhost:3001/ in Chrome
2. **User:** Open DevTools (F12) → Console tab
3. **User:** Paste the console output here
4. **Assistant:** Analyze console output and fix the actual issue

**Shortcut Check:**
```javascript
// Paste this in browser console:
console.log('Maps:', window.__REACT_DEVTOOLS_GLOBAL_HOOK__);
// Or just search console for "previews Map size"
```
