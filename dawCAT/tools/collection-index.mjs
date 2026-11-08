import fs from 'node:fs';
import path from 'node:path';
import { SOUNDS } from '../src/library/sounds.js';
import { SCORES } from '../src/library/scores.js';
import { INSTRUMENTS } from '../src/library/instruments.js';

export function writeCollectionIndex(root) {
  const clock=s=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
  let text='# The Kyoto Sessions · Vol. 01\n\n50 effects and 25 complete original scores. [Open the listening room](../?tab=library). Recipes are in `src/library/sounds.js`, `scores.js` and `instruments.js`. All audio is generated from original deterministic DSP; no external samples or melodies are embedded.\n\n';
  text+='## Sound effects\n\nAll files are already rendered as stereo 48 kHz / 24-bit PCM WAV. Generate alternate takes and refine recipe parameters in the player, or edit the audio in Wave Lab. Hook labels are review metadata; no override is installed in the game.\n\n| # | Effect / WAV | Family | Length | Game reference | Design |\n|---:|---|---|---:|---|---|\n';
  SOUNDS.forEach((s,i)=>{text+=`| ${i+1} | [${s.name}](../media/sfx/${s.id}.wav) | ${s.category} | ${s.duration.toFixed(2)}s | ${s.hook||'New design'} | ${s.description} |\n`;});
  text+='\n## Scores\n\nEach cue has 36 bars, seven tracks, six marked sections, per-bar drum clips and complete note data. The player generates 24-bit WAV and seven aligned stems on demand. AAC is the convenient audition copy, not the lossless master. The MIDI includes channel-10 drums; it does not contain the modeled audio timbres.\n\n| # | Score / listen | Tempo / mode | Duration | Editable files | Arrangement |\n|---:|---|---|---:|---|---|\n';
  SCORES.forEach((s,i)=>{text+=`| ${i+1} | [${s.name} · ${s.japanese}](../media/music/${s.id}.m4a) | ${s.tempo} BPM · ${s.mode} | ${clock(s.duration)} | [Project](../media/projects/${s.id}.dawcat.json) · [MIDI](../media/midi/${s.id}.mid) | ${s.description} |\n`;});
  text+='\n## Modeled instruments\n\nThe Browser and Device Chain expose every instrument below. Controls are limited to parameters used by the selected model. Existing Analog and Sampler instruments are also retained.\n\n| Instrument | Model family | Character |\n|---|---|---|\n';
  INSTRUMENTS.forEach(i=>{text+=`| ${i.name} | ${i.family} | ${i.description} |\n`;});
  text+='\n## File and review notes\n\n[manifest.json](../media/manifest.json) records seeds, waveform peaks, recipe and DSP fingerprints, delivery SHA-256 values, signal statistics and measured delivery loudness. [Research and review](RESEARCH_AND_REVIEW.md) explains the source references, historical interpretation, architecture, validation and remaining limits. [Game inventory](GAME_AUDIO_CATALOG.md) includes sounds outside AudioManager.\n\nThis collection is historically inspired contemporary composition. No human listening sign-off, historical performance authenticity or commercial-DAW parity is claimed. Audio and code follow the repository’s licensing terms; the collection introduces no third-party recording obligations.\n';
  fs.writeFileSync(path.join(root,'docs/COLLECTION.md'),text);
}
