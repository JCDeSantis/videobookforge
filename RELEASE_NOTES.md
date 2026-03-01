## What's New in v1.4.0

### New Features
- **EPUB import** — load the book's `.epub` file on the Import step to provide vocabulary context for AI transcription; proper nouns and the book title/author are automatically extracted and passed as a prompt to whisper.cpp, improving accuracy for character names and uncommon terms
- **Two new AI models** — Large V3 Turbo (Q5_0 quantized, 547 MB) and Large V3 Turbo Full (1.6 GB); the quantized variant uses the same state-of-the-art Large V3 encoder with negligible quality loss at ~6× the speed of Large V3
- **Silence-detection audio segmentation** — audio is split at natural speech boundaries (ffmpeg silencedetect, -35 dB / 1.2 s) into segments up to 20 minutes before transcription; prevents context drift on very long audiobooks and improves timestamp accuracy
- **Forced English mode** — transcription decoder constrained to English-only token vocabulary for a 10–30% speed improvement with no accuracy loss for English audiobooks

### Improvements
- **Large V3 Turbo Q5 set as default model** — new projects default to the highest-quality model rather than Small; GPU badge shown in the model picker when CUDA is active
- Segmentation progress phase ("Detecting audio segments…") shown in the conversion UI between preparing and transcribing steps
- Transcript progress now reflects global elapsed time across all segments rather than resetting per segment

### Technical
- New `src/main/whisper/segments.ts` module: `parseSilences`, `buildSegments`, `extractSegmentWav`, `offsetSrtContent`, `mergeSrts`
- New `src/main/ipc/epub.ipc.ts`: EPUB parsing exposed via IPC using the `epub2` library
- `transcribeAudio` refactored to write a full 16 kHz mono PCM WAV (O(1) segment seeking) and loop over silence-derived segments sequentially
- `WhisperModel` union type and `WhisperPhase` union type extended in `shared/types.ts`
- `epub2` added as a runtime dependency; externalized in Vite config to avoid bundling issues

---
Built with Electron 36 · React 19 · TypeScript 5 · Vite 7 · Tailwind CSS 4 · whisper.cpp v1.8.3
