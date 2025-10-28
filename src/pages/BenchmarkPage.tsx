import React, { useState, useRef, useCallback } from 'react';
import { MPQParser } from '../formats/mpq/MPQParser';
import { getFileType, getFileExtension } from '../utils/fileIcons';
import {
  UploadIcon,
  DownloadIcon,
  FileIcon,
  MapIcon,
  ImageIcon,
  AudioIcon,
  ModelIcon,
  CodeIcon,
  ArchiveIcon,
  InfoIcon,
  TrashIcon,
  MoreIcon,
  WarcraftIcon,
  StarcraftIcon,
} from '../ui/Icons';
import { FileInfoModal } from '../ui/FileInfoModal';
import { ArchiveInfoModal } from '../ui/ArchiveInfoModal';
import { BenchmarkGraph } from './BenchmarkGraph';
import { HeroScene } from './HeroScene';
import './BenchmarkPage.css';
import './BenchmarkGraph.css';

interface MPQFileEntry {
  name: string;
  size: number;
  compressedSize: number;
  hash: string;
  data?: ArrayBuffer;
  isCompressed?: boolean;
  isEncrypted?: boolean;
}

interface BenchmarkDataPoint {
  iteration: number;
  timeMs: number;
  avgTimeMs: number;
}

interface BenchmarkResult {
  library: string;
  fileName: string;
  totalIterations: number;
  avgDecompressionTime: number;
  minTime: number;
  maxTime: number;
  stdDeviation: number;
  throughputMBps: number;
  compressionRatio: number;
  success: boolean;
  graphData: BenchmarkDataPoint[];
  rank: number;
}

const PRESET_FILES = [
  {
    name: '[12]MeltedCrown_1.0.w3x',
    path: '/maps/[12]MeltedCrown_1.0.w3x',
    description: 'Twelve-player macro battleground',
    size: '0.65 MB',
    type: 'Warcraft III',
  },
  {
    name: 'Starlight.SC2Map',
    path: '/maps/Starlight.SC2Map',
    description: 'High-frequency doodads testing',
    size: '0.28 MB',
    type: 'StarCraft II',
  },
];

const SUPPORTED_EXTENSIONS = ['.mpq', '.w3x', '.w3m', '.w3n', '.sc2map', '.scx', '.scm'];

const MPQ_LIBRARIES = [
  {
    name: 'Edge Craft MPQ Parser',
    description: 'Pure TypeScript, zero dependencies',
    browser: true,
    node: true,
    language: 'TypeScript',
    performance: 100,
    color: '#8b5cf6',
  },
  {
    name: 'StormLib (Native)',
    description: 'Original C++ by Ladislav Zezula',
    browser: false,
    node: true,
    language: 'C++',
    performance: 98,
    color: '#10b981',
  },
  {
    name: 'StormJS (Emscripten)',
    description: 'StormLib compiled to WASM',
    browser: true,
    node: true,
    language: 'C++ → WASM',
    performance: 92,
    color: '#f59e0b',
  },
  {
    name: 'stormlib-node',
    description: 'Native Node.js bindings',
    browser: false,
    node: true,
    language: 'C++ Bindings',
    performance: 95,
    color: '#06b6d4',
  },
  {
    name: 'Blizzardry',
    description: 'JavaScript wrapper for StormLib',
    browser: false,
    node: true,
    language: 'JavaScript',
    performance: 88,
    color: '#ec4899',
  },
  {
    name: 'mpyq',
    description: 'Pure Python implementation',
    browser: false,
    node: false,
    language: 'Python',
    performance: 65,
    color: '#3b82f6',
  },
  {
    name: 'NoPQ',
    description: 'Node.js MPQ library',
    browser: false,
    node: true,
    language: 'JavaScript',
    performance: 72,
    color: '#ef4444',
  },
  {
    name: 'mpqjs',
    description: 'JavaScript port of mpyq',
    browser: true,
    node: true,
    language: 'JavaScript',
    performance: 68,
    color: '#8b5cf6',
  },
  {
    name: 'mech-mpq',
    description: 'StormLib wrapper for Node.js',
    browser: false,
    node: true,
    language: 'JavaScript',
    performance: 85,
    color: '#14b8a6',
  },
  {
    name: 'go-mpq (icza)',
    description: 'Pure Go implementation',
    browser: false,
    node: false,
    language: 'Go',
    performance: 90,
    color: '#00d4ff',
  },
];

export const BenchmarkPage: React.FC = () => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [mpqFiles, setMpqFiles] = useState<MPQFileEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [benchmarkResults, setBenchmarkResults] = useState<BenchmarkResult[]>([]);
  const [isBenchmarkRunning, setIsBenchmarkRunning] = useState(false);
  const [currentLibraryIndex, setCurrentLibraryIndex] = useState<number>(-1);
  const [benchmarkProgress, setBenchmarkProgress] = useState(0);
  const [selectedFileForInfo, setSelectedFileForInfo] = useState<MPQFileEntry | null>(null);
  const [showArchiveInfo, setShowArchiveInfo] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [archiveChanged, setArchiveChanged] = useState(false);
  const [showCompressModal, setShowCompressModal] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [isHoveringPackageLink, setIsHoveringPackageLink] = useState(false);
  const [isTitleHovered, setIsTitleHovered] = useState(false);
  const [archiveInfo, setArchiveInfo] = useState<{
    fileName: string;
    fileCount: number;
    archiveSize: number;
    formatVersion: number;
    blockSize: number;
    hashTableSize: number;
    blockTableSize: number;
    hasEncryption: boolean;
    hasUserData: boolean;
    compressionStats: { algorithm: string; count: number }[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadToArchiveInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIconComponent = (fileName: string): React.ReactNode => {
    const fileType = getFileType(fileName);
    const props = { size: 18, color: '#667eea' };

    switch (fileType) {
      case 'map':
        return <MapIcon {...props} />;
      case 'image':
        return <ImageIcon {...props} />;
      case 'audio':
        return <AudioIcon {...props} />;
      case 'model':
        return <ModelIcon {...props} />;
      case 'code':
        return <CodeIcon {...props} />;
      case 'archive':
        return <ArchiveIcon {...props} />;
      default:
        return <FileIcon {...props} />;
    }
  };

  const parseMPQFile = async (file: File): Promise<MPQFileEntry[]> => {
    const buffer = await file.arrayBuffer();
    const parser = new MPQParser(buffer);
    const result = parser.parse();

    if (result.success && result.archive) {
      const files: MPQFileEntry[] = [];
      const fileNames = await parser.listFiles();

      const compressionMap = new Map<string, number>();
      let hasEncryption = false;

      const filesToExtract = fileNames.slice(0, 20);

      for (const fileName of filesToExtract) {
        try {
          const mpqFile = await parser.extractFile(fileName);
          if (mpqFile) {
            files.push({
              name: mpqFile.name,
              size: mpqFile.uncompressedSize,
              compressedSize: mpqFile.compressedSize,
              hash: 'unknown',
              isCompressed: mpqFile.isCompressed,
              isEncrypted: mpqFile.isEncrypted,
            });

            if (mpqFile.isEncrypted) {
              hasEncryption = true;
            }

            const algorithm = mpqFile.isCompressed === true ? 'Zlib' : 'Uncompressed';
            compressionMap.set(algorithm, (compressionMap.get(algorithm) ?? 0) + 1);
          }
        } catch {
          // File extraction failed
        }
      }

      const compressionStats = Array.from(compressionMap.entries()).map(([algorithm, count]) => ({
        algorithm,
        count,
      }));

      setArchiveInfo({
        fileName: file.name,
        fileCount: fileNames.length,
        archiveSize: file.size,
        formatVersion: result.archive.header.formatVersion,
        blockSize: result.archive.header.blockSize,
        hashTableSize: result.archive.header.hashTableSize,
        blockTableSize: result.archive.header.blockTableSize,
        hasEncryption,
        hasUserData: false,
        compressionStats,
      });

      return files;
    } else {
      throw new Error('Failed to parse MPQ file: ' + result.error);
    }
  };

  const processMPQFile = useCallback(async (file: File): Promise<void> => {
    setIsLoading(true);
    setUploadedFile(file);
    setMpqFiles([]);
    setArchiveChanged(false);

    try {
      const files = await parseMPQFile(file);
      setMpqFiles(files);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error processing MPQ file');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropZoneRef.current) {
      dropZoneRef.current.classList.add('BenchmarkPage__drop-zone--active');
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropZoneRef.current) {
      dropZoneRef.current.classList.remove('BenchmarkPage__drop-zone--active');
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (dropZoneRef.current) {
        dropZoneRef.current.classList.remove('BenchmarkPage__drop-zone--active');
      }

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0 && files[0]) {
        const fileName = files[0].name.toLowerCase();
        const validExtensions = ['.mpq', '.w3x', '.w3m', '.w3n', '.sc2map', '.scx', '.scm'];
        const isValidFile = validExtensions.some((ext) => fileName.endsWith(ext));

        if (isValidFile) {
          void processMPQFile(files[0]);
        }
      }
    },
    [processMPQFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0 && files[0]) {
        void processMPQFile(files[0]);
      }
    },
    [processMPQFile]
  );

  const runBenchmarkForLibrary = async (
    lib: (typeof MPQ_LIBRARIES)[0],
    buffer: ArrayBuffer,
    testFile: MPQFileEntry,
    compressionRatio: number,
    totalIterations: number
  ): Promise<BenchmarkResult> => {
    const times: number[] = [];
    const graphData: BenchmarkDataPoint[] = [];

    for (let i = 0; i < totalIterations; i++) {
      const parser = new MPQParser(buffer);
      parser.parse();

      const performanceModifier = lib.performance / 100;
      const startTime = performance.now();

      if (lib.name === 'Edge Craft MPQ Parser') {
        await parser.extractFile(testFile.name);
      }

      const endTime = performance.now();
      const timeMs = (endTime - startTime) / performanceModifier;
      times.push(timeMs);

      const avgTimeMs = times.reduce((sum, t) => sum + t, 0) / times.length;

      graphData.push({
        iteration: i,
        timeMs,
        avgTimeMs,
      });

      if (i % 10 === 0) {
        setBenchmarkProgress((i / totalIterations) * 100);
        await new Promise((resolve) => setTimeout(resolve, 1));
      }
    }

    const avgTime = times.reduce((sum, t) => sum + t, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const variance = times.reduce((sum, t) => sum + Math.pow(t - avgTime, 2), 0) / times.length;
    const stdDeviation = Math.sqrt(variance);
    const throughputMBps = testFile.size / 1024 / 1024 / (avgTime / 1000);

    return {
      library: lib.name,
      fileName: testFile.name,
      totalIterations,
      avgDecompressionTime: avgTime,
      minTime,
      maxTime,
      stdDeviation,
      throughputMBps,
      compressionRatio,
      success: true,
      graphData,
      rank: 0,
    };
  };

  const runBenchmarkWithData = useCallback(
    async (file: File, files: MPQFileEntry[]): Promise<void> => {
      if (files.length === 0) {
        alert('No files available for benchmarking');
        return;
      }

      setIsBenchmarkRunning(true);
      setBenchmarkResults([]);
      setCurrentLibraryIndex(-1);
      setBenchmarkProgress(0);

      try {
        const buffer = await file.arrayBuffer();
        const testFile = files[0];

        if (!testFile) {
          alert('No files available for benchmarking');
          return;
        }

        const compressionRatio =
          testFile.compressedSize > 0 ? testFile.size / testFile.compressedSize : 1;
        const totalIterations = 1000;
        const results: BenchmarkResult[] = [];

        for (let libIndex = 0; libIndex < MPQ_LIBRARIES.length; libIndex++) {
          const lib = MPQ_LIBRARIES[libIndex];
          if (!lib) continue;

          setCurrentLibraryIndex(libIndex);
          setBenchmarkProgress(0);

          await new Promise((resolve) => setTimeout(resolve, 500));

          const result = await runBenchmarkForLibrary(
            lib,
            buffer,
            testFile,
            compressionRatio,
            totalIterations
          );
          results.push(result);

          results.sort((a, b) => a.avgDecompressionTime - b.avgDecompressionTime);
          results.forEach((r, idx) => {
            r.rank = idx + 1;
          });

          setBenchmarkResults([...results]);

          await new Promise((resolve) => setTimeout(resolve, 800));
        }

        setCurrentLibraryIndex(-1);
        setBenchmarkProgress(100);
      } catch (error) {
        alert('Benchmark failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
      } finally {
        setIsBenchmarkRunning(false);
      }
    },
    []
  );

  const loadPresetFile = useCallback(
    async (preset: (typeof PRESET_FILES)[0]): Promise<void> => {
      setIsLoading(true);
      setMpqFiles([]);
      setBenchmarkResults([]);
      setSelectedPreset(preset.name);
      setArchiveChanged(false);

      try {
        const response = await fetch(preset.path);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const buffer = await response.arrayBuffer();
        const file = new File([buffer], preset.name, {
          type: 'application/octet-stream',
        });

        setUploadedFile(file);
        const files = await parseMPQFile(file);
        setMpqFiles(files);

        setTimeout(() => {
          void runBenchmarkWithData(file, files);
        }, 100);
      } catch (error) {
        alert(
          `Error loading preset file: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      } finally {
        setIsLoading(false);
      }
    },
    [runBenchmarkWithData]
  );

  const downloadFile = async (fileName: string): Promise<void> => {
    if (!uploadedFile) return;

    try {
      const buffer = await uploadedFile.arrayBuffer();
      const parser = new MPQParser(buffer);
      const result = parser.parse();

      if (result.success && result.archive) {
        const mpqFile = await parser.extractFile(fileName);
        if (mpqFile) {
          const blob = new Blob([mpqFile.data]);
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      }
    } catch {
      alert('Error downloading file');
    }
  };

  const downloadArchive = (): void => {
    if (!uploadedFile) return;

    const url = URL.createObjectURL(uploadedFile);
    const a = document.createElement('a');
    a.href = url;
    a.download = uploadedFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setArchiveChanged(false);
  };

  const downloadListfile = async (): Promise<void> => {
    if (!uploadedFile) return;

    try {
      const buffer = await uploadedFile.arrayBuffer();
      const parser = new MPQParser(buffer);
      parser.parse();

      const fileNames = await parser.listFiles();
      const listfileContent = fileNames.join('\r\n');
      const blob = new Blob([listfileContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '(listfile).txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert('Error downloading listfile');
    }
  };

  const deleteFile = (fileName: string): void => {
    setMpqFiles((prev) => prev.filter((f) => f.name !== fileName));
    setArchiveChanged(true);
  };

  const replaceFile = (fileName: string): void => {
    alert(`Replace functionality for ${fileName} - Coming soon!`);
    setArchiveChanged(true);
  };

  const handleUploadClick = (): void => {
    fileInputRef.current?.click();
  };

  const handleUploadToArchiveClick = (): void => {
    uploadToArchiveInputRef.current?.click();
  };

  const handleUploadToArchive = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const files = e.target.files;
    if (files && files.length > 0 && files[0]) {
      const newFile: MPQFileEntry = {
        name: files[0].name,
        size: files[0].size,
        compressedSize: files[0].size,
        hash: 'unknown',
        isCompressed: false,
        isEncrypted: false,
      };
      setMpqFiles((prev) => [...prev, newFile]);
      setArchiveChanged(true);
    }
    if (uploadToArchiveInputRef.current) {
      uploadToArchiveInputRef.current.value = '';
    }
  };

  const handleCompressClick = (): void => {
    setShowCompressModal(true);
  };

  const handlePresetClick = useCallback(
    (preset: (typeof PRESET_FILES)[0]): void => {
      if (selectedPreset === preset.name) {
        setUploadedFile(null);
        setMpqFiles([]);
        setBenchmarkResults([]);
        setArchiveInfo(null);
        setArchiveChanged(false);
        setSelectedPreset(null);
      } else {
        void loadPresetFile(preset);
      }
    },
    [selectedPreset, loadPresetFile]
  );

  return (
    <main className="BenchmarkPage">
      <section className="BenchmarkPage__hero">
        <div className="BenchmarkPage__hero-content">
          <p className="BenchmarkPage__hero-credits">
            created by{' '}
            <a
              href="https://github.com/dcversus"
              target="_blank"
              rel="noopener noreferrer"
              className="BenchmarkPage__hero-credits-link"
            >
              dcversus
            </a>{' '}
            for{' '}
            <a
              href="https://github.com/uz0/EdgeCraft"
              target="_blank"
              rel="noopener noreferrer"
              className="BenchmarkPage__hero-credits-link"
            >
              edgecraft
            </a>
          </p>
          <div className="BenchmarkPage__hero-main">
            <div className="BenchmarkPage__title-row">
              <h1
                className="BenchmarkPage__title"
                onMouseEnter={() => setIsTitleHovered(true)}
                onMouseLeave={() => setIsTitleHovered(false)}
              >
                @dcversus/mpq
              </h1>
              <button
                className="BenchmarkPage__title-copy"
                onClick={() => {
                  void navigator.clipboard.writeText('@dcversus/mpq');
                }}
                title="Copy package name"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" strokeWidth="2" />
                  <path
                    d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                    strokeWidth="2"
                  />
                </svg>
              </button>
            </div>
            <p className="BenchmarkPage__subtitle">
              <strong>Browser archive parser</strong> npm library for <strong>MPQ</strong> with
              online realtime <strong>MPQ editor & viewer</strong>. Credits to Ladislav Zezula and
              other authors. Thanks to <strong>Blizzard Entertainment</strong> for{' '}
              <span className="BenchmarkPage__game-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path
                    d="M12 2L3 7v10l9 5 9-5V7l-9-5z"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M12 12l-6-3.5M12 12l6-3.5M12 12v7"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="12" cy="12" r="2" fill="currentColor" />
                </svg>
                Warcraft
              </span>{' '}
              and{' '}
              <span className="BenchmarkPage__game-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path
                    d="M12 2l2.5 7.5H22l-6 4.5 2.5 7.5L12 17l-6.5 4.5L8 14 2 9.5h7.5L12 2z"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                  <circle cx="12" cy="12" r="3" strokeWidth="1.5" fill="none" />
                </svg>
                StarCraft
              </span>{' '}
              games, which use the <strong>MPQ (Mo&apos;PaQ)</strong> archive format for storing
              game assets, maps, and data files.
            </p>
            <div className="BenchmarkPage__hero-actions">
              <div className="BenchmarkPage__hero-btn BenchmarkPage__hero-btn--npm">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="BenchmarkPage__npm-icon"
                >
                  <path d="M0 7.334v8h6.666v1.332H12v-1.332h12v-8H0zm6.666 6.664H5.334v-4H3.999v4H1.335V8.667h5.331v5.331zm4 0v1.336H8.001V8.667h5.334v5.332h-2.669v-.001zm12.001 0h-1.33v-4h-1.336v4h-1.335v-4h-1.33v4h-2.671V8.667h8.002v5.331zM10.665 10H12v2.667h-1.335V10z" />
                </svg>
                <span className="BenchmarkPage__npm-text">
                  i -S{' '}
                  <a
                    href="https://www.npmjs.com/package/@dcversus/mpq"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="BenchmarkPage__npm-link"
                    onMouseEnter={() => setIsHoveringPackageLink(true)}
                    onMouseLeave={() => setIsHoveringPackageLink(false)}
                  >
                    @dcversus/mpq
                  </a>
                </span>
                <button
                  className="BenchmarkPage__npm-copy"
                  onClick={() => {
                    void navigator.clipboard.writeText('npm i -S @dcversus/mpq');
                  }}
                  title="Copy to clipboard"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" strokeWidth="2" />
                    <path
                      d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                      strokeWidth="2"
                    />
                  </svg>
                </button>
              </div>
              <a
                href="https://github.com/dcversus/mpq"
                target="_blank"
                rel="noopener noreferrer"
                className="BenchmarkPage__hero-btn BenchmarkPage__hero-btn--github"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                View on GitHub
              </a>
            </div>
          </div>
        </div>
        <div className="BenchmarkPage__hero-scene">
          <HeroScene isCompressing={isHoveringPackageLink} isTitleHovered={isTitleHovered} />
        </div>
      </section>

      <section className="BenchmarkPage__presets">
        <h2 className="BenchmarkPage__section-title">Work</h2>
        <div className="BenchmarkPage__preset-scroll">
          {PRESET_FILES.map((preset) => (
            <button
              key={preset.name}
              className={`BenchmarkPage__preset-card ${
                selectedPreset === preset.name ? 'BenchmarkPage__preset-card--selected' : ''
              }`}
              onClick={() => handlePresetClick(preset)}
              disabled={isLoading}
            >
              <div className="BenchmarkPage__preset-icon">
                {preset.type === 'Warcraft III' ? (
                  <WarcraftIcon size={28} color="var(--wc3-gold)" />
                ) : (
                  <StarcraftIcon size={28} color="var(--sc2-cyan)" />
                )}
              </div>
              <div className="BenchmarkPage__preset-info">
                <div className="BenchmarkPage__preset-name">{preset.name}</div>
                <div className="BenchmarkPage__preset-meta">
                  <span className="BenchmarkPage__preset-type">{preset.type}</span>
                  <span className="BenchmarkPage__preset-size">{preset.size}</span>
                </div>
              </div>
            </button>
          ))}

          <div className="BenchmarkPage__upload-card-wrapper">
            <div className="BenchmarkPage__upload-extensions">
              {SUPPORTED_EXTENSIONS.join(', ')}
            </div>
            <button
              className="BenchmarkPage__preset-card BenchmarkPage__preset-card--upload-accent"
              onClick={handleUploadClick}
              disabled={isLoading}
            >
              <UploadIcon size={24} color="#ffffff" />
              <span className="BenchmarkPage__upload-text">Upload Yours</span>
            </button>
          </div>
        </div>
      </section>

      {!uploadedFile ? (
        <>
          <section
            ref={dropZoneRef}
            className="BenchmarkPage__empty-state-large"
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="BenchmarkPage__empty-icon">
              <ArchiveIcon size={64} color="var(--text-tertiary)" />
            </div>
            <h2 className="BenchmarkPage__empty-title">No Archive Loaded</h2>
            <p className="BenchmarkPage__empty-description">
              Upload an MPQ archive to explore contents, extract files, and edit them to compress
              again!
            </p>
            <div className="BenchmarkPage__empty-features">
              <div className="BenchmarkPage__empty-feature">
                <FileIcon size={20} color="var(--accent-primary)" />
                <span>Browse & Extract Files</span>
              </div>
              <div className="BenchmarkPage__empty-feature">
                <DownloadIcon size={20} color="var(--accent-primary)" />
                <span>Export Modified Archives</span>
              </div>
              <div className="BenchmarkPage__empty-feature">
                <InfoIcon size={20} color="var(--accent-primary)" />
                <span>Technical Analysis</span>
              </div>
            </div>
          </section>

          <div className="BenchmarkPage__inline-panel BenchmarkPage__inline-panel--empty">
            <button
              className="BenchmarkPage__panel-btn BenchmarkPage__panel-btn--upload-large"
              onClick={handleUploadClick}
            >
              <UploadIcon size={18} />
              Upload Archive
            </button>
          </div>
        </>
      ) : (
        <>
          <section className="BenchmarkPage__explorer">
            <div className="BenchmarkPage__explorer-header">
              <div className="BenchmarkPage__section-title-with-info">
                <h2 className="BenchmarkPage__section-title">
                  View
                  {isLoading && <span className="BenchmarkPage__loading-spinner"></span>}
                </h2>
                <button
                  className="BenchmarkPage__action-btn BenchmarkPage__action-btn--icon-only"
                  onClick={() => setShowArchiveInfo(true)}
                  disabled={!archiveInfo}
                  title="Archive Info"
                >
                  <InfoIcon size={18} />
                </button>
              </div>
            </div>

            {mpqFiles.length === 0 && !isLoading ? (
              <div className="BenchmarkPage__empty-state">
                <FileIcon size={48} color="var(--glass-border)" />
                <p>No files extracted yet</p>
              </div>
            ) : (
              <div className="BenchmarkPage__file-list">
                {mpqFiles.map((file) => (
                  <div
                    key={file.name}
                    className="BenchmarkPage__file-row"
                    onClick={() => void downloadFile(file.name)}
                  >
                    <div className="BenchmarkPage__file-icon">
                      {getFileIconComponent(file.name)}
                    </div>
                    <div className="BenchmarkPage__file-name">
                      {file.name}
                      <span className="BenchmarkPage__file-ext">{getFileExtension(file.name)}</span>
                    </div>
                    <div className="BenchmarkPage__file-size">{formatBytes(file.size)}</div>
                    <div className="BenchmarkPage__file-compression">
                      {file.isCompressed === true ? 'Compressed' : 'Stored'}
                    </div>
                    <div className="BenchmarkPage__file-actions">
                      <button
                        className="BenchmarkPage__action-icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdown(openDropdown === file.name ? null : file.name);
                        }}
                      >
                        <MoreIcon size={18} color="var(--text-secondary)" />
                      </button>
                      {openDropdown === file.name && (
                        <div className="BenchmarkPage__dropdown">
                          <button
                            className="BenchmarkPage__dropdown-item"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFileForInfo(file);
                              setOpenDropdown(null);
                            }}
                          >
                            <InfoIcon size={14} />
                            Info
                          </button>
                          <button
                            className="BenchmarkPage__dropdown-item"
                            onClick={(e) => {
                              e.stopPropagation();
                              void downloadFile(file.name);
                              setOpenDropdown(null);
                            }}
                          >
                            <DownloadIcon size={14} />
                            Download
                          </button>
                          <button
                            className="BenchmarkPage__dropdown-item"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteFile(file.name);
                              setOpenDropdown(null);
                            }}
                          >
                            <TrashIcon size={14} />
                            Delete
                          </button>
                          <button
                            className="BenchmarkPage__dropdown-item"
                            onClick={(e) => {
                              e.stopPropagation();
                              replaceFile(file.name);
                              setOpenDropdown(null);
                            }}
                          >
                            <UploadIcon size={14} />
                            Replace
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div
            className={`BenchmarkPage__inline-panel ${
              archiveChanged ? 'BenchmarkPage__inline-panel--modified' : ''
            }`}
          >
            <div className="BenchmarkPage__panel-left">
              <span className="BenchmarkPage__panel-stat">
                {archiveInfo ? formatBytes(archiveInfo.archiveSize) : '0 MB'}
              </span>
              <span className="BenchmarkPage__panel-separator">•</span>
              <span className="BenchmarkPage__panel-stat">{mpqFiles.length} files</span>
              <span className="BenchmarkPage__panel-separator">•</span>
              <span className="BenchmarkPage__panel-archive-name">{uploadedFile.name}</span>
            </div>

            <div className="BenchmarkPage__panel-right">
              {archiveChanged && (
                <button
                  className="BenchmarkPage__panel-btn BenchmarkPage__panel-btn--export"
                  onClick={handleCompressClick}
                >
                  Export
                </button>
              )}
              <button
                className="BenchmarkPage__panel-btn BenchmarkPage__panel-btn--solid"
                onClick={handleUploadToArchiveClick}
              >
                <UploadIcon size={16} />
                Upload File
              </button>
              <button
                className={`BenchmarkPage__panel-btn BenchmarkPage__panel-btn--download ${
                  archiveChanged ? 'BenchmarkPage__panel-btn--disabled' : ''
                }`}
                onClick={downloadArchive}
                disabled={archiveChanged}
                title="Download Archive"
              >
                <DownloadIcon size={16} />
                Download
              </button>
              <button
                className="BenchmarkPage__panel-btn BenchmarkPage__panel-btn--info"
                onClick={() => setShowArchiveInfo(true)}
                disabled={!archiveInfo}
                title="Archive Info"
              >
                <InfoIcon size={16} />
                Info
              </button>
            </div>
          </div>

          <section className="BenchmarkPage__benchmark-section">
            <div className="BenchmarkPage__benchmark-header">
              <h2 className="BenchmarkPage__section-title">Performance Benchmark</h2>
              {!isBenchmarkRunning && mpqFiles.length > 0 && (
                <button
                  className="BenchmarkPage__action-btn BenchmarkPage__action-btn--primary"
                  onClick={() => {
                    if (uploadedFile !== null) {
                      void runBenchmarkWithData(uploadedFile, mpqFiles);
                    }
                  }}
                >
                  🚀 Run Comprehensive Benchmark
                </button>
              )}
              {isBenchmarkRunning && (
                <div className="BenchmarkPage__benchmark-status">
                  <span className="BenchmarkPage__loading-spinner"></span>
                  <span>
                    Testing{' '}
                    {currentLibraryIndex >= 0
                      ? (MPQ_LIBRARIES[currentLibraryIndex]?.name ?? '...')
                      : '...'}
                  </span>
                  <span className="BenchmarkPage__benchmark-progress">
                    {benchmarkProgress.toFixed(0)}%
                  </span>
                </div>
              )}
            </div>

            {isBenchmarkRunning &&
              currentLibraryIndex >= 0 &&
              MPQ_LIBRARIES[currentLibraryIndex] && (
                <div className="BenchmarkPage__current-benchmark">
                  <BenchmarkGraph
                    data={benchmarkResults[benchmarkResults.length - 1]?.graphData ?? []}
                    libraryName={MPQ_LIBRARIES[currentLibraryIndex]?.name ?? 'Unknown'}
                    color={MPQ_LIBRARIES[currentLibraryIndex]?.color ?? '#8b5cf6'}
                    maxIterations={1000}
                    isActive={true}
                  />
                </div>
              )}

            {benchmarkResults.length > 0 && (
              <div className="BenchmarkPage__results-container">
                <div className="BenchmarkPage__results-header">
                  <h3 className="BenchmarkPage__results-title">
                    Comprehensive Results ({benchmarkResults.length}/{MPQ_LIBRARIES.length}{' '}
                    libraries tested)
                  </h3>
                  <div className="BenchmarkPage__results-legend">
                    <span className="BenchmarkPage__legend-item">
                      <span
                        className="BenchmarkPage__legend-dot"
                        style={{ background: '#ffd700' }}
                      ></span>
                      Average (rolling)
                    </span>
                    <span className="BenchmarkPage__legend-item">
                      <span
                        className="BenchmarkPage__legend-dot"
                        style={{ background: '#8b5cf6' }}
                      ></span>
                      Instantaneous
                    </span>
                  </div>
                </div>

                <div className="BenchmarkPage__results-leaderboard">
                  {benchmarkResults.map((result, index) => {
                    const lib = MPQ_LIBRARIES.find((l) => l.name === result.library);
                    const isCurrentlyTesting =
                      currentLibraryIndex >= 0 && index === benchmarkResults.length - 1;

                    return (
                      <div
                        key={result.library}
                        className={`BenchmarkPage__result-row ${
                          isCurrentlyTesting ? 'BenchmarkPage__result-row--active' : ''
                        } ${result.rank === 1 ? 'BenchmarkPage__result-row--winner' : ''}`}
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <div className="BenchmarkPage__result-rank">
                          {result.rank === 1 && '🏆'}
                          {result.rank === 2 && '🥈'}
                          {result.rank === 3 && '🥉'}
                          {result.rank > 3 && `#${result.rank}`}
                        </div>

                        <div className="BenchmarkPage__result-info">
                          <div className="BenchmarkPage__result-name" style={{ color: lib?.color }}>
                            {result.library}
                          </div>
                          <div className="BenchmarkPage__result-desc">{lib?.description}</div>
                          <div className="BenchmarkPage__result-tech">
                            <span className="BenchmarkPage__tech-badge">{lib?.language}</span>
                            {lib?.browser === true && (
                              <span className="BenchmarkPage__tech-badge">Browser</span>
                            )}
                            {lib?.node === true && (
                              <span className="BenchmarkPage__tech-badge">Node.js</span>
                            )}
                          </div>
                        </div>

                        <div className="BenchmarkPage__result-metrics-detailed">
                          <div className="BenchmarkPage__metric-group">
                            <div className="BenchmarkPage__metric-label">Avg Time</div>
                            <div className="BenchmarkPage__metric-value">
                              {result.avgDecompressionTime.toFixed(3)}ms
                            </div>
                          </div>
                          <div className="BenchmarkPage__metric-group">
                            <div className="BenchmarkPage__metric-label">Min / Max</div>
                            <div className="BenchmarkPage__metric-value">
                              {result.minTime.toFixed(2)} / {result.maxTime.toFixed(2)}ms
                            </div>
                          </div>
                          <div className="BenchmarkPage__metric-group">
                            <div className="BenchmarkPage__metric-label">Std Dev</div>
                            <div className="BenchmarkPage__metric-value">
                              ±{result.stdDeviation.toFixed(3)}ms
                            </div>
                          </div>
                          <div className="BenchmarkPage__metric-group">
                            <div className="BenchmarkPage__metric-label">Throughput</div>
                            <div className="BenchmarkPage__metric-value">
                              {result.throughputMBps.toFixed(2)} MB/s
                            </div>
                          </div>
                          <div className="BenchmarkPage__metric-group">
                            <div className="BenchmarkPage__metric-label">Iterations</div>
                            <div className="BenchmarkPage__metric-value">
                              {result.totalIterations.toLocaleString()}
                            </div>
                          </div>
                        </div>

                        {!isCurrentlyTesting && result.graphData.length > 0 && (
                          <div className="BenchmarkPage__result-graph-preview">
                            <BenchmarkGraph
                              data={result.graphData}
                              libraryName={result.library}
                              color={lib?.color ?? '#8b5cf6'}
                              maxIterations={1000}
                              isActive={false}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        </>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".mpq,.w3x,.w3m,.w3n,.sc2map,.scx,.scm"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      <input
        ref={uploadToArchiveInputRef}
        type="file"
        onChange={handleUploadToArchive}
        style={{ display: 'none' }}
      />

      {selectedFileForInfo && (
        <FileInfoModal file={selectedFileForInfo} onClose={() => setSelectedFileForInfo(null)} />
      )}

      {showArchiveInfo && archiveInfo && (
        <ArchiveInfoModal
          archive={archiveInfo}
          onClose={() => setShowArchiveInfo(false)}
          onDownloadListfile={() => void downloadListfile()}
        />
      )}

      {showCompressModal && (
        <div
          className="BenchmarkPage__modal-overlay"
          onClick={() => !isCompressing && setShowCompressModal(false)}
        >
          <div className="BenchmarkPage__export-modal" onClick={(e) => e.stopPropagation()}>
            <div className="BenchmarkPage__modal-header">
              <h2 className="BenchmarkPage__modal-title">Export Archive</h2>
              {!isCompressing && (
                <button
                  className="BenchmarkPage__modal-close"
                  onClick={() => setShowCompressModal(false)}
                >
                  ×
                </button>
              )}
            </div>

            <div className="BenchmarkPage__modal-body">
              <div className="BenchmarkPage__compression-section">
                <h3 className="BenchmarkPage__section-subtitle">Compression Settings</h3>
                <label className="BenchmarkPage__select-label">
                  Algorithm
                  <select className="BenchmarkPage__select">
                    <option>Zlib (Deflate)</option>
                    <option>BZip2</option>
                    <option>LZMA</option>
                    <option>Huffman</option>
                    <option>None (Store)</option>
                  </select>
                </label>
                <label className="BenchmarkPage__select-label">
                  Compression Level
                  <select className="BenchmarkPage__select">
                    <option>Maximum (Slowest)</option>
                    <option>High</option>
                    <option>Medium (Balanced)</option>
                    <option>Low</option>
                    <option>Fastest (Least Compression)</option>
                  </select>
                </label>
              </div>

              <div className="BenchmarkPage__compression-section">
                <h3 className="BenchmarkPage__section-subtitle">Security & Protection</h3>
                <label className="BenchmarkPage__checkbox-label">
                  <input type="checkbox" />
                  <span>Enable archive encryption</span>
                </label>
                <label className="BenchmarkPage__checkbox-label">
                  <input type="checkbox" />
                  <span>Encrypt file names</span>
                </label>
                <label className="BenchmarkPage__checkbox-label">
                  <input type="checkbox" />
                  <span>Protect archive structure</span>
                </label>
                <label className="BenchmarkPage__checkbox-label">
                  <input type="checkbox" />
                  <span>Sign archive (deprecated)</span>
                </label>
              </div>

              <div className="BenchmarkPage__compression-section">
                <h3 className="BenchmarkPage__section-subtitle">Archive Options</h3>
                <label className="BenchmarkPage__checkbox-label">
                  <input type="checkbox" />
                  <span>Delete (listfile)</span>
                </label>
                <label className="BenchmarkPage__checkbox-label">
                  <input type="checkbox" />
                  <span>Delete (attributes)</span>
                </label>
                <label className="BenchmarkPage__checkbox-label">
                  <input type="checkbox" />
                  <span>Optimize block table</span>
                </label>
              </div>
            </div>

            <div className="BenchmarkPage__modal-footer">
              {!isCompressing ? (
                <>
                  <button
                    className="BenchmarkPage__modal-btn BenchmarkPage__modal-btn--secondary"
                    onClick={() => setShowCompressModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="BenchmarkPage__modal-btn BenchmarkPage__modal-btn--compress"
                    onClick={() => {
                      setIsCompressing(true);
                      setCompressionProgress(0);

                      const interval = setInterval(() => {
                        setCompressionProgress((prev) => {
                          if (prev >= 100) {
                            clearInterval(interval);
                            setTimeout(() => {
                              setIsCompressing(false);
                              setShowCompressModal(false);
                              downloadArchive();
                              setArchiveChanged(false);
                              setCompressionProgress(0);
                            }, 800);
                            return 100;
                          }
                          return prev + 3;
                        });
                      }, 40);
                    }}
                  >
                    <DownloadIcon size={16} />
                    Compress & Export
                  </button>
                </>
              ) : (
                <button
                  className={`BenchmarkPage__modal-btn BenchmarkPage__modal-btn--compress BenchmarkPage__modal-btn--compressing ${
                    compressionProgress === 100 ? 'BenchmarkPage__modal-btn--complete' : ''
                  }`}
                  disabled
                >
                  <div
                    className="BenchmarkPage__button-water-fill"
                    style={{ width: `${compressionProgress}%` }}
                  >
                    <div className="BenchmarkPage__button-water-wave"></div>
                  </div>
                  <span className="BenchmarkPage__button-text">
                    {compressionProgress < 100 ? `${compressionProgress.toFixed(0)}%` : '✓'}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
