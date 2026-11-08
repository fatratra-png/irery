# Irery

*Irery* means "alone" in Malagasy: your own quiet bubble.

Irery plays calm soundscapes, fully offline. It has no account, no backend, no AI and no network requests. Every sound ships inside the app.

## What's inside

- **19 soundscapes**, in four groups:
  - **Water**: rain, thunder, drops, stream, ocean, shore
  - **Nature**: forest, night crickets, campfire, wind
  - **Focus**: lo-fi, typing, theta binaural, white, pink and brown noise
  - **Meditate**: singing bowl, wind chimes, deep space
- **A mood per sound**: each sound has its own palette, animated scene (rain, storm, ripples, waves, fireflies, embers, stars, bokeh, wind, aurora…) and breathing pace. Colours, scene and audio cross-fade when you switch sounds.
- **A calm player**: the breathing orb is the play button, the controls fade away after 12 s, and any touch brings them back.
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

Requires Expo SDK 58.

## Sounds

Seven ambiences are synthesized from maths by `scripts/generate-sounds.py`, so they need no samples, no downloads and no licences:

- singing bowl, wind chimes, night crickets, deep space
- theta binaural, pink noise, brown noise

The same script normalizes **every** sound to −23 LUFS, so switching sounds never jumps in volume.

To regenerate the sounds (requires `numpy` and `ffmpeg`):

```bash
python3 scripts/generate-sounds.py
```
