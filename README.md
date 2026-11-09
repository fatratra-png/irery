# Irery

*Irery* means "alone" in Malagasy: your own quiet bubble.

Irery plays calm soundscapes, fully offline. It has no account, no backend, no AI and no network requests. Every sound ships inside the app.

## What's inside

- **19 soundscapes**, in four groups:
  - **Water**: rain, thunder, drops, stream, ocean, shore
  - **Nature**: forest, night crickets, campfire, wind
  - **Focus**: lo-fi, typing, theta binaural, white, pink and brown noise
  - **Meditate**: singing bowl, wind chimes, deep space
- **Realistic living scenes**, drawn on the GPU by shaders (React Native Skia), with no video and no images:
  - rain sliding down a window, with lightning on the storm
  - a moonlit sea, a rippling pond, a brook with caustics
  - a campfire with sparks, a misty forest with light shafts
  - a starry night with the Milky Way, aurora, drifting clouds and mist

  Scenes are rendered at half resolution to save battery, and every shader is compiled behind the splash screen, so switching never stalls. When you switch sounds, the new scene spreads out over the old one from where you touched (the card, the side you swiped from), in time with the audio cross-fade.
- **Visuals that follow the real sound**: each recording's loudness envelope and attacks are analysed once at build time (`scripts/analyze-sounds.py`) and shipped with the app. Lightning strikes on actual thunder claps, ripples open on bowl strikes, sparks fly on fire crackles, and the waves swell with the surf. No microphone permission is needed.
- **A scene carousel**: swipe up (or tap *Scenes*) to browse every scene as a living card, with parallax and category chips that follow the reel. Tap a card and it grows into the full-screen scene.
- **An immersive player**: swipe left or right on the scene to change sound; the controls fade away after 12 s, and any touch brings them back.
- **A liquid-glass orb**, drawn by a shader: its light swirls with the sound, sends a ring out on each attack or tap, breathes at the mood's pace and blends into the next sound's colours. It is the play button.
- **Springy, tactile controls**: buttons sink under the finger and spring back, with haptic feedback. Only the bottom bar uses a live blur (real on iOS and web, a tint on Android); the other panels use a tint, which keeps the scenes smooth.
- **Sleep timer** (15–90 min) that fades the sound out over the last 30 seconds.
- **Background playback**, including on silent mode, with lock-screen info.
- Remembers the last sound and the volume.
- Respects the system "reduce motion" setting.

## Run it

```bash
npm install
npx expo start          # Expo Go, or press w for the web preview
npx expo run:android    # native build (android/ is generated on demand)
```

Requires Expo SDK 58. The web preview loads Skia's runtime from `public/canvaskit.wasm`, which `npm install` copies locally, so the web preview stays offline too.

## Sounds

Seven ambiences are synthesized from maths by `scripts/generate-sounds.py`, so they need no samples, no downloads and no licences:

- singing bowl, wind chimes, night crickets, deep space
- theta binaural, pink noise, brown noise

The same script normalizes **every** sound to −23 LUFS, so switching sounds never jumps in volume.

To regenerate the sounds and their analysis (requires `numpy` and `ffmpeg`):

```bash
python3 scripts/generate-sounds.py   # synthesize + normalize loudness
python3 scripts/analyze-sounds.py    # envelopes and attacks for the visuals
```
