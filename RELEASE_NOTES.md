## What's New in v1.3.1

### Improvements
- **"Create Another"** replaces "Start Over" on the completion screen — clicking it now fully resets all project state (files, metadata, background, subtitle settings, output path) and returns to step 1 for a clean slate
- **Auto-select AI subtitles** — if you reach the Convert step without configuring a subtitle source (no SRT uploaded, no AI queued), AI generation is now automatically selected with the default Base model so nothing is skipped unintentionally

### Bug Fixes
- **Open Folder** now correctly opens the folder containing the output file and selects it in Windows Explorer — previously it was navigating one level too high to the parent directory
- **Window title** now correctly shows "VideoBook Forge" instead of "Electron"

### Technical
- Added GitHub Actions workflow (`.github/workflows/build-release.yml`) — pushing a version tag to GitHub now automatically builds the Windows installer on a `windows-latest` runner and publishes it as a release asset
- Added `resetProject()` action to the Zustand store for clean full-state resets

---
Built with Electron 36 · React 19 · TypeScript · whisper.cpp · ffmpeg
