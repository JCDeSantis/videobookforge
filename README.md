# VideoBookForge

Convert audiobook files (`.m4b`, `.mp3`) into video files (`.mkv`, `.mp4`) with cover art backgrounds, embedded metadata, chapter markers, and AI-generated or manual subtitles.

![Platform](https://img.shields.io/badge/platform-Windows-blue)
![Version](https://img.shields.io/badge/version-1.3.2-violet)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Features

### Import
- Drag-and-drop `.m4b` and `.mp3` files — multi-part audiobooks fully supported
- Drag-to-reorder parts or use **Auto-sort** (alphanumeric, numeric-aware)
- Shows per-file duration and total runtime

### Metadata
- **Auto-reads embedded tags** from `.m4b` and `.mp3` files (title, author, narrator, cover art, year, genre, etc.)
- **Online lookup** — searches MusicBrainz, Open Library, and Google Books simultaneously; ranked results with confidence scores
- Editable fields: Title, Author, Narrator, Series, Series Part, Year, Genre, Publisher, Description
- Cover art displayed and replaceable

### Background
- **Cover art** — uses the book's embedded or imported cover image
- **Custom image** — any `.jpg`, `.png`, `.webp`, or `.bmp` file
- **Solid color** — flat color via color picker
- **Gradient** — two-color gradient with four direction options; live preview
- Real-time preview panel (16:9)

### AI Subtitle Generation (whisper.cpp)
- Powered by [whisper.cpp](https://github.com/ggerganov/whisper.cpp) — runs fully offline, no API key required
- Four model sizes: **Tiny**, **Base**, **Small** (default), **Medium**
- **GPU acceleration** — automatically downloads a CUDA build when an NVIDIA GPU is detected; falls back to CPU
- **Queue & convert** — select a model on the Import step and AI transcription runs automatically as the first phase of conversion, fully unattended
- If no subtitle source is configured on the Convert step, AI generation is auto-selected with the default model
- AI Storage panel — view download status, GPU/CPU mode, delete engine or individual models to free disk space

### Subtitle Options
- Attach a manual `.srt` file via drag-and-drop or Browse
- **MKV**: embed as a soft subtitle track (toggle on/off in any player); optional burn-in
- **MP4**: always burned into video for maximum device compatibility
- **SRT export**: when not burning in, the subtitle file is automatically copied alongside the output video with a matching filename (e.g. `Audiobook.srt` next to `Audiobook.mkv`)

### Export Settings
- **Format**: MKV (default — lossless audio passthrough, soft subtitles, full chapter support) or MP4 (re-encoded for broad device compatibility)
- **Resolution**: 720p (1280×720) or 1080p (1920×1080)
- **Output path**: choose any folder; filename auto-generated from book title
- Settings locked in on a dedicated step before conversion begins

### Conversion
- **GPU-accelerated encoding** — uses `h264_nvenc` when an NVIDIA GPU is present; falls back to `libx264`
- **Optimized framerate** — static image background encoded at 1 fps (25× faster than standard); subtitle burn-in uses 5 fps for smooth text transitions
- **Auto-chain mode** — if AI subtitles are queued, transcription and conversion run back-to-back with one click; walk away and come back to a finished file
- Two-phase progress display (Mic → Film) showing elapsed/total time for each phase
- Chapter markers embedded from subtitle timestamps
- Full conversion log (collapsible)
- Cancel stops whichever phase is currently running

---

## Wizard Flow

```
1. Import Files  →  2. Metadata  →  3. Background  →  4. Export Settings  →  5. Convert
```

Configure everything up front, hit **Generate & Convert** on step 5, and the app handles the rest.

---

## Requirements

- **Windows** (10 or 11)
- [ffmpeg](https://ffmpeg.org/download.html) — install to `C:\ffmpeg\bin\` or anywhere on your system PATH
- An NVIDIA GPU is optional but recommended for faster AI transcription and video encoding

---

## Installation

Download the latest installer from the [Releases](https://github.com/JCDeSantis/videobookforge/releases) page and run it. No additional setup required — whisper.cpp downloads automatically on first use.

---

## Development

```bash
# Install dependencies
npm install

# Start in dev mode (hot reload)
npm run dev

# Type-check only
npm run typecheck

# Build for Windows
npm run build:win
```

> **Note:** Run commands from **Command Prompt** or **Git Bash**. If using PowerShell, first run:
> ```
> Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
> ```

---

## Tech Stack

### Runtime Dependencies
| Package | Version | Purpose |
|---|---|---|
| [Electron](https://www.electronjs.org/) | 36 | Desktop shell, file system access, IPC |
| [React](https://react.dev/) | 19 | UI framework |
| [TypeScript](https://www.typescriptlang.org/) | 5 | Type safety across main + renderer |
| [Zustand](https://zustand-demo.pmnd.rs/) | 5 | Global wizard state management |
| [Tailwind CSS](https://tailwindcss.com/) | 4 | Utility-first styling |
| [Radix UI](https://www.radix-ui.com/) | — | Accessible UI primitives (dialog, label, progress, select, tabs, tooltip, slider, separator) |
| [lucide-react](https://lucide.dev/) | — | Icon library |
| [dnd-kit](https://dndkit.com/) | — | Drag-and-drop file reordering |
| [ffmpeg-static](https://github.com/eugeneware/ffmpeg-static) | 5 | Bundled ffmpeg binary (NVENC-capable on Windows) |
| [ffprobe-static](https://github.com/descriptinc/ffprobe-static) | 3 | Bundled ffprobe for audio duration/tag probing |
| [music-metadata](https://github.com/borewit/music-metadata) | 11 | Read embedded tags and cover art from `.m4b` / `.mp3` |
| [axios](https://axios-http.com/) | 1 | Metadata API requests (MusicBrainz, Open Library, Google Books) |
| [whisper.cpp](https://github.com/ggerganov/whisper.cpp) | v1.8.3 | Offline AI speech-to-text (downloaded at runtime, CUDA-accelerated) |
| class-variance-authority | — | Component variant utility |
| clsx / tailwind-merge | — | Conditional class composition |

### Build & Dev Dependencies
| Package | Purpose |
|---|---|
| [electron-vite](https://electron-vite.org/) | Build tooling for Electron + Vite |
| [electron-builder](https://www.electron.build/) | Windows installer packaging |
| [Vite](https://vitejs.dev/) | Renderer bundler |
| [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react) | React fast refresh in dev |
| [ESLint](https://eslint.org/) + [Prettier](https://prettier.io/) | Linting and formatting |
| @electron-toolkit/\* | Electron preload helpers and tsconfig base |
| GitHub Actions | CI/CD — automatically builds and publishes the Windows installer on tag push |

---

## Project Structure

```
src/
├── main/                          # Electron main process (Node.js)
│   ├── index.ts                   # App lifecycle, window creation
│   ├── ipc/
│   │   ├── conversion.ipc.ts      # convert:start, convert:cancel
│   │   ├── files.ipc.ts           # File dialogs, show-in-explorer
│   │   ├── metadata.ipc.ts        # Tag reading, online lookup
│   │   └── whisper.ipc.ts         # Transcription, storage management
│   ├── ffmpeg/
│   │   ├── probe.ts               # ffprobe wrapper, NVENC detection
│   │   ├── concat.ts              # Multi-part audio concatenation
│   │   ├── background.ts          # Background video stream generation
│   │   └── convert.ts             # Master FFmpeg pipeline (MKV + MP4)
│   ├── metadata/
│   │   ├── embedded.ts            # music-metadata reader
│   │   ├── musicbrainz.ts         # MusicBrainz API
│   │   ├── openlibrary.ts         # Open Library API
│   │   └── googlebooks.ts         # Google Books API
│   └── whisper/
│       ├── binary.ts              # whisper.cpp download, GPU detection, storage
│       └── models.ts              # Model download, transcription runner
├── renderer/src/
│   ├── App.tsx                    # 5-step wizard shell + navigation
│   ├── pages/
│   │   ├── ImportPage.tsx         # Audio files + subtitle intent
│   │   ├── MetadataPage.tsx       # Tags + online lookup
│   │   ├── BackgroundPage.tsx     # Background picker + live preview
│   │   ├── ExportSettingsPage.tsx # Format, resolution, burn-in, output path
│   │   └── ConvertPage.tsx        # Process runner (transcription → conversion)
│   ├── components/
│   │   ├── StepNav.tsx            # Step indicator bar
│   │   ├── FileDropZone.tsx       # Reusable drop target
│   │   ├── FileList.tsx           # Sortable audio file list
│   │   ├── TranscriptionOverlay.tsx # Full-screen AI progress + live transcript
│   │   └── ui/                    # Button, Badge, Label, etc.
│   ├── store/
│   │   └── useProjectStore.ts     # Zustand store (all wizard state)
│   └── lib/
│       ├── ipc.ts                 # Typed IPC wrappers
│       ├── utils.ts               # formatDuration, basename, cn
│       └── whisperModels.ts       # Model definitions (id, name, size, description)
├── preload/
│   └── index.ts                   # Exposes IPC bridge to renderer
└── shared/
    └── types.ts                   # Shared TypeScript types (IPC keys, interfaces)
```

---

## License

MIT
