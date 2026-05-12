# Audio Files

Place your `.mp3` audio files in this directory.

## Naming Convention

| File name | Purpose |
|---|---|
| `ambient-chapter.mp3` | Default ambient audio for all chapters |
| `choosing-homesite.mp3` | Chapter-specific ambient (matches the chapter URL slug) |
| `pest-control.mp3` | Another chapter-specific example |
| `annotation-peasant.mp3` | Sound effect for peasant annotations (future) |
| `annotation-peon.mp3` | Sound effect for peon annotations (future) |
| `annotation-acolyte.mp3` | Sound effect for acolyte annotations (future) |
| `annotation-wisp.mp3` | Sound effect for wisp annotations (future) |

## How It Works

The site JavaScript (`assets/js/audio.js`) automatically looks for audio files:

1. First it checks for a chapter-specific file matching the URL slug (e.g., `pest-control.mp3`)
2. If not found, it falls back to `ambient-chapter.mp3`
3. If no audio files exist, the audio button stays hidden

A floating 🔇/🔊 button appears in the bottom-right corner when audio is available. Click to play/pause.

## Suggested Audio Ideas

- **Ambient forest sounds** for Wisp chapters
- **Hammer and stonework** for Theodore's sections
- **Drums and grunts** for Morgum's sections
- **Eerie chanting or wind** for Vorun's sections
- **General medieval tavern ambiance** as a default
