# Kyoto Sessions rendered media

50 stereo 48 kHz / 24-bit WAV effects, 25 full 192 kb/s AAC music auditions, 25 native editable projects and 25 MIDI files with note and drum patterns.

These are generated deliverables, not a cache that must be built before using the studio. `manifest.json` contains the file fingerprints and signal measurements. Original recipes and the shared PCM generator live in `../src/library/`. Use `npm run library:build` from dawCAT to regenerate them; Node and FFmpeg are required for the build but not for browser playback. `--lossless` additionally writes FLAC music; the listening room also renders original 24-bit WAV and aligned stems on demand.

No third-party samples, reference recordings, pretrained model outputs or traditional melodies are embedded. Files follow the repository's licensing terms. See `../docs/RESEARCH_AND_REVIEW.md` for references, design choices and the limits of the acoustic approximations. No game assets or sound calls have been replaced.
