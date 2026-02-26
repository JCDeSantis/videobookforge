# VideoBookForge

Convert audiobook files (`.m4b`, `.mp3`) into video files (`.mkv`, `.mp4`) with cover art, metadata, and optional subtitles.

Built with Electron + React + TypeScript.

![Platform](https://img.shields.io/badge/platform-Windows-blue)
![Version](https://img.shields.io/badge/version-1.0.0-violet)

## Features

- **Drag-and-drop** `.m4b` and `.mp3` files — multi-part audiobooks supported with drag-to-reorder
- **Metadata lookup** — searches MusicBrainz, Open Library, and Google Books simultaneously; auto-reads embedded tags
- **Background options** — use the book's cover art, a custom image, a solid color, or a gradient
- **Subtitle support** — attach an `.srt` file; MKV embeds as a soft track (toggle in player), MP4 burns in; optional burn-in for MKV too
- **Live conversion progress** — shows elapsed and total time (e.g. `1:23:45 / 13:00:00`)
- **MKV or MP4 output** at 720p or 1080p

## Requirements

- [ffmpeg](https://ffmpeg.org/download.html) installed and available on PATH (or at `C:\ffmpeg\bin\`)

## Installation

Download the latest installer from the [Releases](https://github.com/JCDeSantis/videobookforge/releases) page and run it.

## Development

```bash
# Install dependencies
npm install

# Start in dev mode
npm run dev

# Build for Windows
npm run build:win
```

> **Note:** Run from Command Prompt or Git Bash. If using PowerShell, run `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser` first.

## Tech Stack

- [Electron](https://www.electronjs.org/) + [electron-vite](https://electron-vite.org/)
- [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS v4](https://tailwindcss.com/) + [Radix UI](https://www.radix-ui.com/)
- [Zustand](https://zustand-demo.pmnd.rs/) · [dnd-kit](https://dndkit.com/) · [ffmpeg](https://ffmpeg.org/)

## License

MIT
