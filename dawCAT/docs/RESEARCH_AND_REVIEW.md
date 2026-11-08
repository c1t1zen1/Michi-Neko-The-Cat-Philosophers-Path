# dawCAT 3 · Kyoto Sessions research and production review

Reviewed and implemented 2026-11-08. Scope: `dawCAT/` only. The game sources were read for the inventory and reference auditions; no game sound, scene, cache tag or UI was changed.

## Delivered collection

**50 designed effects and 25 original scores**, with approximately **45.6 minutes of music**. The media files are already rendered, rather than empty presets or prompts for a future generator. [COLLECTION.md](COLLECTION.md) lists every title and its files. [GAME_AUDIO_CATALOG.md](GAME_AUDIO_CATALOG.md) covers the original game's 28 generators and systems; its JSON companion contains source bodies, hashes and call sites.

Each score is a 36-bar, seven-track editable project: lead, response, string accompaniment, sustained harmony, low foundation, eight-lane percussion, and bronze/keys punctuation. Six marked sections develop the authored motif through an introduction, A, B, breathing space, decorated return and ending. Each track contains 36 clips, with note velocities, articulation lengths, humanized starts, per-bar drum changes, fills and volume automation. They are full arrangements, not 25 transpositions of a single loop. The arranger is deterministic so every project can be regenerated.

The range runs from sparse bamboo/biwa chamber cues to koto with electric tines, felt piano, rounded sub bass and restrained electronic percussion. This is an **original contemporary game score inspired by Kyoto and historical instruments**. It is not an Edo-period reconstruction, a transcription of honkyoku, or a reproduction of a Gion float's protected/community repertoire. Equal-tempered MIDI scales are composition tools here; their names do not describe every historical tuning practice.

## Audit of the existing workbench

| Area | Before this pass | Work completed in this pass |
|---|---|---|
| Composition | Arrangement, piano roll, drum grid, note entry, clip loops, automation and mixer already existed | 25 complete native arrangements; section navigation; 25 associated grooves in the rhythm explorer (67 total) |
| Instruments | Seven presets largely shared a two-oscillator subtractive voice | 16 separately designed string, wind, reed, modal, key, pad, bass and lead models; browser presets and model-specific controls |
| Sound design | 24 layered procedural templates; game previews were approximate oscillator/noise sketches | 50 new deterministic recipes, editable numeric recipe controls, saved refinements, take generation and actual 24-bit WAVs |
| Reference review | Game cue scanner, with rough SFX previews | Complete source inventory, including the three hidden-place generators; 18 original AudioManager methods captured read-only for actual A/B renders |
| Audio | Import, trim, reverse, fades, varispeed, WSOLA stretch, pitch shift, filters, drive, modulation, echo and chromatic sampler already existed | Stereo-linked compression, DC removal, peak normalization, RMS matching constrained by a peak ceiling, mains-hum notches, gate and isolated-click repair; edits save new assets; native song renders now print automation and export 48 kHz / 24-bit WAV |
| Recording | Main-thread ScriptProcessor capture; 30-second cap | AudioWorklet PCM capture, with compatibility fallback and flush acknowledgement; six-minute cap; stereo microphone/internal recording |
| MIDI | Note-only file import/export and fixed-length musical typing | Hardware input selection, velocity and held-note capture, sustain, live ±2-semitone bend, disconnect/panic; channel-10 drum patterns and UTF-8 names in MIDI exports |
| Auditioning | Per-patch/per-track previews | Playlist player with waveform, seek, volume, next/previous, queue, shuffle, repeat, favorites, persistent named playlists and collection downloads |
| Delivery | Basic WAV output and generated game bridge | 48 kHz / 24-bit stereo SFX; full AAC music auditions; 24-bit music rendering; aligned unmastered stems; native projects; MIDI; recipes, fingerprints and delivery measurements |

The existing editor was retained and extended; its previous features are not being counted as newly built. Old Analog presets and SFX exports retain their existing behaviour. The new modeled voices are guarded from the older game's oscillator-only export runtime, so an export cannot silently turn a koto model into two sine waves. Game integration remains a separate task.

## Research and resulting design decisions

The references below were consulted online on 2026-11-08. All synthesis and compositions in the collection were written for this project. No reference recordings, melodies, sample packs, trained weights or third-party synthesis code were copied into the collection.

### Animal voices and environmental effects

Schötz's [2012 pilot study](https://lup.lub.lu.se/search/publication/d2621c3b-fdc1-485c-ade6-e5b2b6ad5dfb) analyses domestic-cat vocalizations by duration and fundamental frequency and reports substantial variation. Her [2025 overview](https://lup.lub.lu.se/search/publication/a3095e8b-8334-42df-960b-08e14e836e7c) distinguishes meow, trill, purr, hiss, chirp and chatter types. These support separate articulation families and variable contours rather than one oscillator sweep reused at different pitches.

The new meow implementation uses a glottal excitation, three moving resonant bands, a closed/open/closed vowel trajectory, irregular voicing, pitch contour and aspiration. The purr combines voiced pulses, filtered turbulence and a slow breathing envelope at a designed 26 Hz pulse rate. The game's original purr has a comment saying approximately 27.5 Hz but actually modulates at 55 Hz; the inventory records the discrepancy without changing the game. Trill/chatter have different interruption patterns. These are plausible synthetic designs, not anatomically calibrated models or recordings of a real cat.

Material footsteps combine soft pad contact with short surface grains and different resonant bodies. Stone, ceramic, timber, tatami, gravel, moss, grass and water are independent recipes. Water separates initial turbulence from dispersed, upward-sweeping damped bubble events. Ambience separates continuous filtered noise from discrete drops, crackles or bird phrases. Take numbers seed the excitation and event placement. These particular recipe structures and parameters are our own sound-design choices, rather than measurements from the animal or object.

Bird calls are explicitly labelled inspired designs. The garden phrase is not presented as an authenticated uguisu recording. The choir is a synthetic vowel cloud with no recorded singer or words. Ambient files fade at both ends; looping them with an approximately 80 ms overlap avoids an audible hole. They are not represented as phase-periodic recordings.

### Strings, wind, bronze and percussion

Julius O. Smith's [Physical Audio Signal Processing](https://www.dsprelated.com/freebooks/pasp/), particularly [digital waveguide models](https://www.dsprelated.com/freebooks/pasp/Digital_Waveguide_Models.html) and the [plucked-string model](https://www.dsprelated.com/freebooks/pasp/Digital_Waveguide_Plucked_String_Model.html), provides the physical/signal-model distinction and excitation/feedback framework. The implemented string uses a fractional delay, loss filtering, a pick-position comb and a separate short body response. It does **not** implement a full nonlinear finite-difference string/body simulation or a measured instrument impulse response.

The Japan Arts Council's [Bunraku shamisen account](https://www2.ntj.jac.go.jp/unesco/bunraku/en/performer/performer2.html) describes the bachi's percussive role, the membrane body, and sawari contact. [Oe et al. (2009)](https://www.jstage.jst.go.jp/article/jsmedmc/2009/0/2009__613-1_/_article/-char/en) treats sawari and modal analysis as important to shamisen sound. [Ando (1993)](https://doi.org/10.1250/ast.14.377) discusses pitch flexibility and sawari in traditional instruments. These motivated a stronger attack, a different body band and a short nonlinear buzzing component, rather than simply renaming the koto patch. The buzz is a controllable approximation, not a validated contact simulation.

[Stanford's koto resource](https://gagaku.stanford.edu/en/strings/koto/) illustrates the instrument's role in its own tradition; it was used to avoid treating all Japanese string music as interchangeable. The score's koto parts are contemporary invented motifs. No court music pattern was transcribed. [Pro Musica Nipponia's shamisen description](https://www.promusica.or.jp/english/shamisen.html) also informs the separation between basic string pitch and sawari colour.

Flutes use a harmonic source, resonant filtered breath, pitch scoop and delayed vibrato. Shakuhachi and shinobue have different attacks and breath balance. This is an efficient signal model, not a complete jet/bore waveguide. Bronze and glass voices use inharmonic mode banks, different modal decay times and paired beating resonances. Drums use several membrane-like ratios, noisy strike excitations and seeded alternate strikes. Koto, muted koto, shamisen, biwa, shakuhachi, shinobue, shō-like cloud, bonshō, bowl, fūrin, mokugyo, tine keys, felt piano, warm pad, bass and FM-coloured lead all render through the same portable PCM engine used for the assets.

### Kyoto music identity

Kyoto City University of Arts' [Gion-bayashi archive](https://rijtm.kcua.ac.jp/archive-db/archives/resarc/gionbayashi/kitakannonyama/english.html) is a direct fieldwork resource. The Gion Matsuri organization describes a flute, rubbed gong and shime-daiko ensemble in its [Minami Kannon-yama material](https://www.gionmatsuri.or.jp/uploads/pdf/%E7%A5%87%E5%9C%92%E7%A5%AD%E5%8D%97%E8%A6%B3%E9%9F%B3%E5%B1%B1%E5%90%8D%E5%AE%9D%E5%B1%95%E7%A4%BA%E3%81%AE%E3%81%94%E6%A1%88%E5%86%85.pdf). This motivated the flute/wood/skin/bronze interplay in Gion Afterglow and Edo, Tomorrow, with original rhythms and melodies. The palette is more specific than using a generic large cinematic taiko on every cue.

The arrangements leave space after questions, reserve richer accompaniment for later sections, and use softer attacks for interiors. Modern elements are explicit: electric keys, felt piano, FM lead, sub bass, pads and electronic patterns. The shō-like pad is a modern texture in this score, not a claim that it belongs to every Edo street ensemble. Sparse cues prioritize stillness; brighter cues support exploration without combat, deadlines or failure stingers.

### DAW interaction and measurement

Ableton's [Recording New Clips](https://www.ableton.com/en/live-manual/12/recording-new-clips/) and [audio-recording guidance](https://help.ableton.com/hc/en-us/articles/7938193554460-Recording-Audio) informed the distinction between an audio recording, note capture and an editable clip. The [Web MIDI specification](https://www.w3.org/TR/webmidi/) supplies the browser MIDI interface and message semantics. Hardware access is requested only when the user clicks Connect keyboard, with SysEx disabled. Note and sustain semantics are tested with synthetic messages; a physical keyboard was not available for this verification.

Audacity's [dynamic-range guidance](https://support.audacityteam.org/audio-editing/reducing-dynamic-range-compressor-limiter) and [normalization explanation](https://manual.audacityteam.org/man/amplify_and_normalize.html) distinguish peak level from perceived loudness. Its [noise-reduction manual](https://manual.audacityteam.org/man/noise_reduction.html) describes a noise-profile workflow. Accordingly, dawCAT labels its new quiet-passage tool a **gate**, not spectral noise reduction. DC removal, hum notches, peak normalization, RMS matching and stereo-linked compression each perform a separate operation.

[ITU-R BS.1770-5](https://www.itu.int/rec/R-REC-BS.1770-5-202311-I) distinguishes programme loudness from true peak. The browser UI reports **sample peak and RMS**, without relabelling either as LUFS. The build invokes FFmpeg's `ebur128=peak=true` on delivered files for independent integrated loudness and true-peak measurements. Integrated loudness is omitted for effects shorter than the 400 ms analysis block. Transient effects should be judged in their intended mix, not normalized to a music LUFS target.

## Rendering, mixing and delivery

- SFX masters: stereo 48 kHz, dithered 24-bit PCM WAV. One-shots target −4 dBFS sample peak; nature/loop beds target −9 dBFS. These are audition masters, not final per-event game gains.
- Score auditions: full-length 48 kHz AAC at 192 kb/s, about 100 MiB for all delivered audio combined with SFX. AAC is for convenient auditioning. Lossless 24-bit WAV is regenerated directly from the original recipe in the player; `npm run library:build -- --lossless` also creates FLAC music files.
- Music mastering: gentle linked compression, a −22 dBFS RMS target constrained by a −2 dBFS sample-peak ceiling; measured delivered loudness is preserved in the manifest. This is a design choice for quiet exploration, not an industry-mandated game loudness specification.
- Stems: seven aligned 24-bit WAVs, starting at zero with the same tail. Fader, pan, automation, send return and master fader are printed. Master compression and normalization are excluded, so summing stems reconstructs the portable pre-master mix.
- Native editing and the portable library bounce share the instrument PCM generator and event flattener. The live editor's existing convolution/delay buses differ from the portable bounce's deterministic room/echo. Use the editor's Render WAV for a mix with user-added insert devices/imported audio; the Library stem renderer is intentionally limited to the authored library arrangement.
- Every item has a stable ID, seed, recipe fingerprint, source fingerprint, file SHA-256, waveform peaks and signal statistics. `--resume` skips only matching recipe and DSP fingerprints. Scratch files use the OS temporary directory and are removed.

## Validation and candid limits

The automated suite passed **246 tests**. It includes real PCM generation for all 50 effects, deterministic hashes, fades, finite values, signal energy, all 25 native/MIDI arrangements, instrument/drum distinctness, near-concert-C4 string tuning, velocity response, stem summation, mastering stereo linkage, offline automation, 24-bit WAV encoding and MIDI capture semantics. The delivery verifier passed **102 checks**, including full decode of all 75 audio files, file fingerprints, duration, format and untouched source hashes. See [LIBRARY_VERIFICATION.json](LIBRARY_VERIFICATION.json).

A real headless Chromium session passed **21 workflow checks**: search, playback, persistent favorites/playlists, queue completion, worker synthesis, original A/B, recipe refinement, filtered collection ZIP download, Wave Lab import, immutable mastering, AudioWorklet recording, AAC playback, MIDI/WAV/stem download, channel-10 drum-grid import, complete project load, undo restoration, audible nonzero native-engine output and a native 24-bit WAV render whose silent automation region stays silent. No JavaScript runtime errors were observed. See [BROWSER_VERIFICATION.json](BROWSER_VERIFICATION.json). Physical microphone and MIDI-device latency, Safari/Firefox behaviour, mobile memory limits and long hardware sessions have not been measured.

To repeat the browser checks, serve the repository root, make Playwright available in your development environment, then run `npm run library:browser` from dawCAT. `DAWCAT_BASE_URL` selects the server (default `http://localhost:8000`); `PLAYWRIGHT_MODULE` can point at an external Playwright install and `CHROMIUM_PATH` at an existing Chromium binary. The check uses an isolated browser profile, keeps captures/downloads in the OS temporary directory and writes the JSON report here. No Playwright dependency is needed at runtime.

“AAA” is a production quality judgement, not a file count, algorithm or test result. This pass delivers the complete requested content counts and a working extended browser studio. It does not certify photoreal animal identity, concert-instrument authenticity or parity with a mature commercial DAW. It has no VST/AU hosting, multitrack take comping, tempo maps, MPE recording or full automation recording from hardware CCs. MIDI sustain and bend are heard live; note timing/velocity are captured, but CC/bend lanes are not retained. Preview notes use a bounded twelve-second voice; longer sustained performances should use recorded audio or edited MIDI playback.

Before installing any of these sounds into the game, human listening on headphones, laptop speakers and a phone should establish the preferred takes, instrument balance and event gains against the actual ambient/music mix. The A/B controls and individually editable projects make that review practical. No such human listening approval is claimed here.
