/**
 * Realistic scenes as SkSL runtime shaders (GPU, computed on device: no video,
 * no image, fully offline).
 *
 * Shared uniforms (set by <ShaderScene>):
 *   iResolution  canvas size in px        iTime   seconds
 *   level        0..1 audio envelope      onsetAge seconds since the last attack
 *   c0 c1 c2     mood gradient (top → bottom), accent: mood highlight
 *   ages, seeds  last four attacks (ages in s, random seeds) for ripples/sparks
 */

const COMMON = `
uniform float2 iResolution;
uniform float iTime;
uniform float level;
uniform float onsetAge;
uniform float3 c0;
uniform float3 c1;
uniform float3 c2;
uniform float3 accent;
uniform float4 ages;
uniform float4 seeds;

float hash(float2 p) { p = fract(p * float2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float hash1(float n) { return fract(sin(n) * 43758.5453); }
float noise(float2 p) {
  float2 i = floor(p); float2 f = fract(p);
  float2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + float2(1, 0)), u.x), mix(hash(i + float2(0, 1)), hash(i + float2(1, 1)), u.x), u.y);
}
float fbm(float2 p) {
  float v = 0.0; float a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + float2(1.7, 9.2); a *= 0.5; }
  return v;
}
float3 grad3(float t) { return t < 0.5 ? mix(c0, c1, t * 2.0) : mix(c1, c2, (t - 0.5) * 2.0); }
float3 tonemap(float3 c) { return c / (1.0 + c * 0.35); }
// Fine film grain hides gradient banding on phone screens.
float3 grain(float3 c, float2 fc) { return c + (hash(fc + fract(iTime) * 91.0) - 0.5) * 0.018; }
`;

/* ------------------------------------------------------------------ */
/* Rain sliding down a window, refracting blurred city lights behind.   */
/* ------------------------------------------------------------------ */
export const RAIN_GLASS = `${COMMON}
uniform float drops;   // 0 = dry window (lo-fi), 1 = heavy rain
uniform float flash;   // lightning 0..1

// What's behind the glass: out-of-focus lights (bokeh) over the mood gradient.
float3 behind(float2 uv) {
  float3 col = grad3(clamp(1.0 - uv.y, 0.0, 1.0)) * 0.9;
  col += accent * 0.12 * exp(-pow((uv.y - 0.62) * 3.5, 2.0));
  float2 sq = float2(uv.x * iResolution.x / iResolution.y, uv.y);  // round bokeh, not ellipses
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float2 g = sq * (3.5 + fi * 2.2) + float2(fi * 7.1, fi * 3.3);
    float2 id = floor(g); float2 f = fract(g) - 0.5;
    float h = hash(id + fi);
    float2 o = (float2(hash(id + 3.1), hash(id + 7.7)) - 0.5) * 0.3;
    float d = length(f - o);
    float r = 0.12 + 0.2 * hash(id + 1.9);   // r + |o| < 0.5: a light never crosses its cell edge
    float lit = step(0.55, h) * smoothstep(0.35, 0.75, uv.y + 0.1 * fi);
    float3 lc = mix(accent, float3(1.0, 0.72, 0.45), hash(id + 5.3));
    col += lc * lit * smoothstep(r, r * 0.55, d) * (0.10 + 0.05 * fi) * (0.85 + 0.15 * sin(iTime * 0.6 + h * 40.0));
  }
  return col;
}

// One drop field: returns refraction offset (xy) and coverage (z).
float3 dropLayer(float2 uv, float scale, float t, float seed) {
  float2 aspect = float2(2.0, 1.0);
  float2 p = uv * scale * aspect;
  float colX = floor(p.x);
  float speed = 0.35 + 0.5 * hash1(colX + seed);
  p.y += t * speed + hash1(colX * 3.7 + seed) * 10.0;
  float2 id = floor(p);
  float2 f = fract(p) - 0.5;
  float n = hash(id + seed);
  float wob = sin(p.y * 3.0 + n * 6.28) * 0.08;
  float2 c = float2(wob + (n - 0.5) * 0.4, -0.25 + 0.5 * fract(n * 7.0 + t * 0.07));
  float2 d = (f - c) / aspect * float2(1.0, 1.3);
  float r = 0.10 + 0.07 * n;
  float drop = smoothstep(r, r * 0.6, length(d));
  // Trail of tiny droplets left behind the drop.
  float trailMask = smoothstep(c.y, c.y + 0.45, f.y) * smoothstep(0.06, 0.0, abs(f.x - c.x - wob * 0.5));
  float2 tf = fract(float2(f.x, f.y * 6.0)) - 0.5;
  float tiny = smoothstep(0.18, 0.08, length(tf * float2(1.6, 1.0))) * trailMask;
  float present = step(0.35, n);
  float cover = max(drop, tiny * 0.8) * present;
  float2 offs = -d * (drop * 2.2 + tiny * 0.8) * present;
  return float3(offs, cover);
}

// Small static droplets sitting on the glass.
float3 staticDrops(float2 uv, float t) {
  float2 p = uv * 38.0;
  float2 id = floor(p); float2 f = fract(p) - 0.5;
  float n = hash(id);
  float2 o = (float2(n, fract(n * 13.0)) - 0.5) * 0.7;
  float2 d = f - o;
  float life = fract(t * 0.05 + n);           // droplets slowly appear and evaporate
  float r = 0.28 * smoothstep(0.0, 0.2, life) * smoothstep(1.0, 0.8, life) * step(0.55, n);
  // Guard: smoothstep(0, 0, x) is undefined and used to fill whole cells.
  float drop = r > 0.01 ? smoothstep(r, r * 0.4, length(d)) : 0.0;
  return float3(-d * drop * 0.9, drop);
}

half4 main(float2 fc) {
  float2 uv = fc / iResolution;
  uv.y = 1.0 - uv.y;
  float2 st = float2(uv.x * iResolution.x / iResolution.y, uv.y);
  float t = iTime;

  float3 l1 = dropLayer(st, 4.0, t, 1.0) * drops;
  float3 l2 = dropLayer(st, 7.0, t * 1.2, 4.0) * drops;
  float3 s = staticDrops(st, t) * drops;
  float cover = clamp(l1.z + l2.z + s.z, 0.0, 1.0);
  float2 offs = (l1.xy + l2.xy * 0.6 + s.xy) * 0.06;

  // Fogged glass blurs and dims the lights; drops are clear lenses.
  float3 blurred = behind(uv + float2(0.004, 0.0)) * 0.5 + behind(uv - float2(0.004, 0.003)) * 0.5;
  float3 clear = behind(uv + offs * 2.0) * 1.15;
  float fog = 0.35 * drops;
  float3 col = mix(blurred * (1.0 - fog * 0.5) + c2 * fog * 0.15, clear, cover);
  // Drops read as lenses: a dark rim and a small specular highlight on top.
  float rim = clamp(cover * (1.0 - cover) * 4.0, 0.0, 1.0);
  col *= 1.0 - rim * 0.45;
  col += float3(0.9, 0.95, 1.0) * smoothstep(0.012, 0.03, -offs.y) * cover * 0.18;

  col += flash * float3(0.75, 0.8, 1.0) * (0.35 + 0.65 * uv.y);
  col *= 0.92 + 0.08 * level;
  float vig = smoothstep(1.25, 0.35, length((uv - 0.5) * float2(1.0, 1.3)));
  col *= mix(0.65, 1.0, vig);
  return half4(half3(grain(tonemap(col), fc)), 1.0);
}`;

/* ------------------------------------------------------------------ */
/* Open sea at night: perspective waves reflecting a moon.              */
/* ------------------------------------------------------------------ */
export const SEA = `${COMMON}
uniform float swell;  // base wave height for this sound

float waveH(float2 p, float t, float amp) {
  float h = 0.0;
  h += sin(p.x * 0.9 + t * 0.8 + sin(p.y * 0.3)) * 0.5;
  h += sin(p.x * 1.7 - p.y * 0.6 + t * 1.3) * 0.25;
  h += sin(p.x * 3.1 + p.y * 1.4 - t * 1.9) * 0.12;
  h += (fbm(p * 0.8 + float2(t * 0.15, -t * 0.25)) - 0.5) * 0.6;
  return h * amp;
}

half4 main(float2 fc) {
  float2 uv = fc / iResolution;
  float y = 1.0 - uv.y;
  float aspect = iResolution.x / iResolution.y;
  float horizon = 0.52;
  float t = iTime;
  float2 moon = float2(0.68, 0.74);

  // Sky.
  float3 sky = mix(c1 * 1.1, c0, smoothstep(horizon, 1.0, y));
  sky += accent * 0.25 * exp(-pow((y - horizon) * 9.0, 2.0));
  float md = length((float2(uv.x * aspect, y) - float2(moon.x * aspect, moon.y)));
  sky += float3(1.0, 0.97, 0.9) * smoothstep(0.045, 0.04, md);
  sky += accent * 0.35 * exp(-md * 9.0);
  float st = step(0.997, hash(floor(fc * 0.5))) * smoothstep(horizon + 0.05, 1.0, y);
  sky += st * (0.5 + 0.5 * sin(t * 2.0 + hash(floor(fc)) * 30.0)) * 0.6;

  float3 col = sky;
  if (y < horizon) {
    float depth = horizon - y;
    float z = 0.12 / depth;                       // distance into the sea
    float2 p = float2((uv.x - 0.5) * aspect * z * 3.0, z * 3.0 + t * 0.4);
    float amp = swell * (0.55 + 0.9 * level);
    float e = 0.02;
    float h0 = waveH(p, t, amp);
    float hx = waveH(p + float2(e, 0.0), t, amp);
    float hz = waveH(p + float2(0.0, e), t, amp);
    float3 n = normalize(float3(-(hx - h0) / e, 1.0, -(hz - h0) / e * 0.5));

    // Reflection of the sky and the moon's glitter path.
    float fres = pow(1.0 - clamp(n.y, 0.0, 1.0), 3.0) * 0.6 + 0.04;
    float3 water = mix(c2 * 0.35, c1 * 0.55, smoothstep(0.0, horizon, y));
    float path = exp(-pow((uv.x - moon.x) * aspect * (1.2 + depth * 2.0), 2.0) * 5.0);
    float sparkleN = noise(p * float2(14.0, 5.0) + t * 2.0);
    float glitter = pow(clamp(dot(n, normalize(float3((moon.x - uv.x) * 0.6, 1.0, 0.6))), 0.0, 1.0), 40.0) * step(0.55, sparkleN);
    float diffuse = clamp(dot(n, normalize(float3(0.3, 1.0, -0.6))), 0.0, 1.0);
    col = water * (0.7 + 0.6 * diffuse) + sky * fres;
    col += float3(1.0, 0.95, 0.85) * (glitter * 3.0 + 0.12) * path;
    col += accent * path * 0.08;
    // Foam on crests when the swell is loud.
    float foam = smoothstep(0.55, 0.9, h0 / max(amp, 0.001)) * smoothstep(0.25, 0.0, depth) * level;
    col += float3(0.85, 0.9, 0.95) * foam * 0.5;
    // Haze towards the horizon.
    col = mix(col, sky, smoothstep(0.05, 0.0, depth) * 0.85);
  }
  float vig = smoothstep(1.3, 0.4, length((uv - 0.5) * float2(1.0, 1.4)));
  col *= mix(0.7, 1.0, vig);
  return half4(half3(grain(tonemap(col), fc)), 1.0);
}`;

/* ------------------------------------------------------------------ */
/* Still dark water seen from above, rippling with drops and strikes.   */
/* ------------------------------------------------------------------ */
export const POND = `${COMMON}
uniform float ambient;  // 0..1 background drizzle of small ripples

float ring(float2 p, float2 c, float age, float speed, float decay) {
  float d = length(p - c);
  float r = age * speed;
  float w = d - r;
  return sin(w * 38.0) * exp(-w * w * 60.0) * exp(-age * decay) * smoothstep(0.0, 0.05, age);
}

float field(float2 p, float t) {
  float h = 0.0;
  // Ambient drizzle: one periodic ripple per grid cell, random phase.
  for (int i = 0; i < 2; i++) {
    float fi = float(i);
    float sc = 3.0 + fi * 1.7;
    float2 g = p * sc + fi * 11.0;
    float2 id = floor(g);
    float2 jitter = (float2(hash(id + fi), hash(id + 9.0 + fi)) - 0.5) * 0.3;
    float2 c = (id + 0.5 + jitter - fi * 11.0) / sc;
    float period = 2.5 + 3.0 * hash(id + 4.0);
    float age = mod(t + hash(id) * period, period);
    // Fade the ring before it reaches the cell border, so cells never show seams.
    float edge = smoothstep(0.3 / sc, 0.15 / sc, length(p - c));
    h += ring(p, c, age, 0.06, 2.2) * ambient * 0.7 * edge * step(0.35, hash(id + 2.0 + fi));
  }
  // Big rings from real attacks in the sound (drops, bowl strikes).
  for (int k = 0; k < 4; k++) {
    float a = ages[k];
    float s = seeds[k];
    float2 c = float2(0.25 + 0.5 * hash1(s * 17.0), 0.3 + 0.4 * hash1(s * 31.0));
    c.x *= iResolution.x / iResolution.y;
    h += ring(p, c, a, 0.16, 0.45) * 1.4 * step(a, 9.0);
  }
  return h;
}

half4 main(float2 fc) {
  float2 uv = fc / iResolution;
  float aspect = iResolution.x / iResolution.y;
  float2 p = float2(uv.x * aspect, uv.y);
  float t = iTime;
  float e = 0.0025;
  float h = field(p, t);
  float hx = field(p + float2(e, 0.0), t);
  float hy = field(p + float2(0.0, e), t);
  float2 n = float2(hx - h, hy - h) / e * 0.012;

  // Deep water: the mood gradient, slow sheen, and the sky reflected through the normals.
  float2 q = p + n * 3.0;
  float3 col = grad3(clamp(q.y, 0.0, 1.0)) * 0.75;
  col += c2 * 0.25 * fbm(q * 2.0 + t * 0.03);
  float light = clamp(dot(normalize(float3(n * 8.0, 1.0)), normalize(float3(-0.4, -0.6, 0.7))), 0.0, 1.0);
  col += accent * pow(light, 24.0) * 0.9;
  col += accent * 0.06 * exp(-length((q - float2(aspect * 0.65, 0.25)) * float2(1.0, 2.0)) * 3.0);
  col *= 0.9 + 0.1 * level;
  float vig = smoothstep(1.2, 0.3, length(uv - 0.5));
  col *= mix(0.55, 1.0, vig);
  return half4(half3(grain(tonemap(col), fc)), 1.0);
}`;

/* ------------------------------------------------------------------ */
/* A clear brook: flowing caustics over a pebbly bed.                   */
/* ------------------------------------------------------------------ */
export const STREAM = `${COMMON}
// Animated Voronoi: returns (F1, F2) distances.
float2 voronoi(float2 p, float t) {
  float2 i = floor(p); float2 f = fract(p);
  float f1 = 8.0; float f2 = 8.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      float2 g = float2(float(x), float(y));
      float2 o = float2(hash(i + g), hash(i + g + 17.0));
      o = 0.5 + 0.45 * sin(t + 6.2831 * o);
      float d = length(g + o - f);
      if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) { f2 = d; }
    }
  }
  return float2(f1, f2);
}

half4 main(float2 fc) {
  float2 uv = fc / iResolution;
  float aspect = iResolution.x / iResolution.y;
  float2 p = float2(uv.x * aspect, uv.y) * 3.2;
  float t = iTime * (0.7 + 0.5 * level);
  float2 flow = float2(t * 0.22, t * 0.04);

  // Surface ripples bend what we see of the bed.
  float2 warp = float2(fbm(p * 1.3 + flow * 2.0), fbm(p * 1.3 + flow * 2.0 + 7.3)) - 0.5;
  float2 bedP = p + warp * 0.18;

  // Pebbles: Voronoi cells, each its own shade, darker in the gaps.
  float2 cell = voronoi(bedP * 2.6, 0.0);
  float2 id = floor(bedP * 2.6);
  float shade = hash(id + floor(bedP.yx * 2.6));
  float gap = smoothstep(0.02, 0.12, cell.y - cell.x);
  float3 bed = mix(c2 * 0.55, c1 * 1.15, shade) * (0.45 + 0.55 * gap);
  bed *= 0.75 + 0.25 * fbm(bedP * 9.0);

  // Caustics: the light network focused by the moving surface.
  float2 v1 = voronoi(p * 3.0 + flow * 3.0 + warp, t * 1.4);
  float2 v2 = voronoi(p * 5.2 - flow * 2.0 + warp * 1.5, t * 1.9 + 3.0);
  float c = pow(1.0 - smoothstep(0.0, 0.18, v1.y - v1.x), 3.0) * 0.8 + pow(1.0 - smoothstep(0.0, 0.12, v2.y - v2.x), 3.0) * 0.45;
  float3 col = bed + accent * c * (0.32 + 0.16 * level);

  // Water tint, depth towards the top and soft sky glint.
  col = mix(col, c0 * 0.9, 0.35 * smoothstep(0.2, 1.0, 1.0 - uv.y));
  col += accent * 0.05 * smoothstep(0.6, 1.0, fbm(p * 0.8 + flow));
  float vig = smoothstep(1.25, 0.35, length(uv - 0.5));
  col *= mix(0.6, 1.0, vig);
  return half4(half3(grain(tonemap(col), fc)), 1.0);
}`;

/* ------------------------------------------------------------------ */
/* Campfire: rising flames, glowing logs and sparks on crackles.        */
/* ------------------------------------------------------------------ */
export const FIRE = `${COMMON}
float3 fireRamp(float v) {
  float3 a = float3(0.0);
  a = mix(a, float3(0.35, 0.04, 0.01), smoothstep(0.08, 0.25, v));
  a = mix(a, float3(0.95, 0.28, 0.04), smoothstep(0.25, 0.5, v));
  a = mix(a, float3(1.0, 0.62, 0.18), smoothstep(0.5, 0.72, v));
  a = mix(a, float3(1.0, 0.9, 0.65), smoothstep(0.72, 0.95, v));
  return a;
}

float logShape(float2 p, float2 a, float2 b, float r) {
  float2 pa = p - a; float2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return smoothstep(r, r * 0.8, length(pa - ba * h));
}

half4 main(float2 fc) {
  float2 uv = fc / iResolution;
  float aspect = iResolution.x / iResolution.y;
  float2 p = float2((uv.x - 0.5) * aspect, 1.0 - uv.y);
  float t = iTime;
  float base = 0.36;                 // sits above the glass control panel
  float lv = 0.62 + 0.35 * level;
  float y = p.y - base;

  // Background: dark night, warm light spilling around the fire.
  float3 col = c0 * 0.55 + c1 * 0.18 * smoothstep(0.8, 0.0, p.y);
  float glow = exp(-length(float2(p.x * 1.4, y * 1.1)) * 3.2) * lv;
  col += float3(1.0, 0.42, 0.12) * glow * (0.32 + 0.06 * sin(t * 9.0) * level);

  // Flame: rising turbulence carved into tongues by a tapering threshold.
  float2 q = float2(p.x * 4.2, y * 3.0);
  float turb = fbm(q * 1.6 - float2(0.0, t * 2.2)) * 0.65 + fbm(q * 3.4 - float2(t * 0.4, t * 3.6)) * 0.35;
  float width = (0.11 + 0.04 * level) * smoothstep(0.6 * lv, 0.0, y) + 0.015;
  float body = smoothstep(width, 0.0, abs(p.x + (turb - 0.5) * 0.12 * y * 3.0));
  float flame = body * smoothstep(0.75 * lv, 0.0, y) * step(-0.01, y);
  flame = clamp(flame * (0.55 + turb * 0.9) - y * 0.35, 0.0, 1.0);
  col += fireRamp(flame) * 1.35;

  // Logs: short rounded branches crossing, with glowing cracks.
  float l1 = logShape(p, float2(-0.15, base - 0.045), float2(0.11, base + 0.015), 0.022);
  float l2 = logShape(p, float2(0.15, base - 0.045), float2(-0.1, base + 0.02), 0.02);
  float l3 = logShape(p, float2(-0.07, base - 0.065), float2(0.08, base - 0.06), 0.018);
  float logs = max(max(l1, l2), l3);
  float cracks = pow(smoothstep(0.55, 0.9, fbm(float2(p.x * 40.0, p.y * 40.0 + t * 0.3))), 2.0) * 1.8;
  col = mix(col, float3(0.06, 0.03, 0.02) + float3(1.0, 0.32, 0.06) * cracks * (0.6 + 0.4 * level), logs);

  // Sparks drifting up, more right after a crackle.
  float burst = exp(-onsetAge * 1.5);
  for (int i = 0; i < 22; i++) {
    float fi = float(i);
    float speed = 0.22 + 0.25 * hash1(fi);
    float life = fract(t * speed + hash1(fi * 7.0));
    float2 sp = float2((hash1(fi * 3.0) - 0.5) * 0.25 + sin(life * 7.0 + fi) * 0.04 * life, base + 0.05 + life * (0.7 + 0.5 * hash1(fi * 5.0)));
    float d = length(p - sp);
    float on = step(hash1(fi * 11.0), 0.45 + 0.55 * burst);
    col += float3(1.0, 0.58, 0.2) * (smoothstep(0.005, 0.0, d) + 0.25 * exp(-d * 140.0)) * (1.0 - life) * on * 1.4;
  }
  // Ground with ash and stones.
  float ground = smoothstep(base - 0.06, base - 0.12, p.y);
  col = mix(col, c0 * 0.35 + float3(0.25, 0.08, 0.03) * glow * 0.6, ground * 0.85);
  float vig = smoothstep(1.35, 0.15, length((uv - float2(0.5, 0.6)) * float2(1.0, 1.15)));
  col *= mix(0.3, 1.0, vig);
  return half4(half3(grain(tonemap(col), fc)), 1.0);
}`;

/* ------------------------------------------------------------------ */
/* Misty forest: layered trunks, drifting fog and light shafts.         */
/* ------------------------------------------------------------------ */
export const FOREST = `${COMMON}
// One row of trunks: slightly leaning, wider at the base.
float trunks(float x, float y, float seed, float density, float width) {
  float g = x * density + seed;
  float id = floor(g);
  float f = fract(g);
  float lean = (hash1(id * 5.0 + seed) - 0.5) * 0.08 * y;
  float w = width * (0.55 + 0.9 * hash1(id + seed)) * (1.0 + 0.6 * smoothstep(0.25, 0.0, y));
  float c = 0.5 + (hash1(id * 3.0 + seed) - 0.5) * 0.4 + lean;
  float bark = 0.85 + 0.15 * noise(float2(id * 7.0, y * 40.0));
  return step(0.28, hash1(id * 7.0 + seed)) * smoothstep(w, w * 0.75, abs(f - c)) * bark;
}

half4 main(float2 fc) {
  float2 uv = fc / iResolution;
  float aspect = iResolution.x / iResolution.y;
  float y = 1.0 - uv.y;
  float x = uv.x * aspect;
  float t = iTime;

  // Hazy, bright sky glowing through the canopy.
  float3 haze = mix(c2 * 1.45 + accent * 0.25, c1 * 1.15, smoothstep(0.15, 1.0, y));
  float3 col = haze;
  float2 sun = float2(aspect * 1.1, 1.35);   // off-screen, top right

  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    float depth = 1.0 - fi / 6.0;                            // 1 = far, 0 = near
    float sway = sin(t * 0.25 + fi * 1.3) * 0.002 * fi;
    float tr = trunks(x + sway + fi * 0.37, y, fi * 13.0, 1.4 + depth * 7.0, 0.05 + (1.0 - depth) * 0.06);
    float groundLine = 0.08 + fi * 0.015 + 0.02 * noise(float2(x * 3.0 + fi, fi));
    float ground = smoothstep(groundLine + 0.01, groundLine - 0.01, y);
    // Far trees dissolve into the haze (aerial perspective).
    float3 tc = mix(c0 * 0.28, haze * 0.92, pow(depth, 1.3) * 0.9);
    col = mix(col, tc, clamp(tr + ground, 0.0, 1.0));
    // Fog bank drifting between rows.
    float fog = smoothstep(0.35, 0.8, fbm(float2(x * 1.2 + t * 0.015 * (fi + 1.0), y * 3.0 + fi * 2.0)));
    col = mix(col, haze, fog * 0.22 * depth * smoothstep(0.6, 0.0, y));
  }

  // Volumetric light shafts falling from the sun through the trees.
  float2 dir = normalize(float2(x, y) - sun);
  float ang = atan(dir.y, dir.x);
  float shafts = smoothstep(0.35, 0.85, fbm(float2(ang * 7.0, t * 0.03))) * 0.9;
  float reach = exp(-length(float2(x, y) - sun) * 1.1);
  col += mix(accent, float3(1.0, 0.95, 0.8), 0.4) * shafts * reach * (0.45 + 0.2 * level);

  // Dust motes catching the light.
  for (int k = 0; k < 18; k++) {
    float fk = float(k);
    float2 mp = float2(fract(hash1(fk) + t * 0.008 * (hash1(fk * 2.0) - 0.5)) * aspect, fract(hash1(fk * 5.0) + t * 0.012) * 0.9 + 0.1);
    float d = length(float2(x, y) - mp);
    col += float3(1.0, 0.97, 0.85) * smoothstep(0.0035, 0.0, d) * (0.4 + 0.6 * sin(t * 0.8 + fk)) * reach * 2.0;
  }
  float vig = smoothstep(1.3, 0.35, length((uv - 0.5) * float2(1.0, 1.25)));
  col *= mix(0.55, 1.0, vig);
  return half4(half3(grain(tonemap(col), fc)), 1.0);
}`;

/* ------------------------------------------------------------------ */
/* Night sky: Milky Way, twinkling stars, hills and fireflies.          */
/* ------------------------------------------------------------------ */
export const NIGHT = `${COMMON}
uniform float milky;   // strength of the Milky Way band
uniform float aurora;  // strength of aurora curtains (deep space, noises)

half4 main(float2 fc) {
  float2 uv = fc / iResolution;
  float aspect = iResolution.x / iResolution.y;
  float y = 1.0 - uv.y;
  float x = uv.x * aspect;
  float t = iTime;

  float3 col = mix(c2 * 0.9, c0, smoothstep(0.0, 1.0, y));
  col += accent * 0.08 * exp(-pow((y - 0.25) * 4.0, 2.0));

  // Milky Way: a soft diagonal band of dust.
  float band = exp(-pow((y - 0.55 - (x - aspect * 0.5) * 0.45) * 3.2, 2.0));
  float dust = fbm(float2(x, y) * 3.0 + 3.0) * fbm(float2(x, y) * 7.0);
  col += mix(c2, accent, 0.5) * band * dust * 0.9 * milky;
  col -= float3(0.05) * band * smoothstep(0.45, 0.6, fbm(float2(x, y) * 5.0 + 9.0)) * milky;

  // Aurora curtains.
  if (aurora > 0.0) {
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      float cx = x * (1.2 + fi * 0.3) + fbm(float2(x * 0.8 + t * 0.02, fi)) * 1.5;
      float curtain = pow(fbm(float2(cx * 4.0, t * 0.05 + fi)), 2.0);
      float vert = smoothstep(0.35 + fi * 0.05, 0.65, y) * smoothstep(1.0, 0.7, y);
      float rays = 0.6 + 0.4 * sin(cx * 40.0 + t * 0.3);
      float3 ac = mix(accent, c2 * 1.6, fi / 2.0);
      col += ac * curtain * vert * rays * aurora * (0.5 + 0.35 * level);
    }
  }

  // Stars, more inside the Milky Way, gently twinkling.
  for (int i = 0; i < 2; i++) {
    float fi = float(i);
    float2 g = fc / (3.0 + fi * 2.0);
    float2 id = floor(g);
    float h = hash(id + fi * 17.0);
    float thresh = 0.992 - band * 0.012 * milky - fi * 0.003;
    float tw = 0.6 + 0.4 * sin(t * (1.0 + 3.0 * h) + h * 60.0);
    float2 f = fract(g) - 0.5;
    col += step(thresh, h) * smoothstep(0.5, 0.0, length(f)) * tw * smoothstep(0.15, 0.4, y) * (0.8 + fi * 0.4);
  }
  // Shooting star every ~14 s.
  float cyc = mod(t, 14.0);
  float2 sp = float2(aspect * (0.2 + 0.08 * cyc), 0.92 - 0.06 * cyc);
  float trail = smoothstep(0.004, 0.0, abs((y - sp.y) + (x - sp.x) * 0.75)) * step(x, sp.x) * smoothstep(sp.x - 0.25, sp.x, x);
  col += float3(0.9, 0.95, 1.0) * trail * step(cyc, 1.2) * (1.2 - cyc);

  // Hills.
  float h1 = 0.17 + 0.05 * fbm(float2(x * 1.3, 2.0));
  float h2 = 0.1 + 0.04 * fbm(float2(x * 2.5 + 5.0, 1.0));
  col = mix(col, c0 * 0.6 + c1 * 0.15, smoothstep(h1 + 0.002, h1 - 0.002, y));
  col = mix(col, c0 * 0.35, smoothstep(h2 + 0.002, h2 - 0.002, y));
  // Fireflies above the grass, brighter as the crickets sing.
  for (int k = 0; k < 10; k++) {
    float fk = float(k);
    float2 fp = float2(fract(hash1(fk) + 0.02 * sin(t * 0.3 + fk)) * aspect, 0.05 + 0.12 * hash1(fk * 3.0) + 0.02 * sin(t * 0.7 + fk * 2.0));
    float glow = (0.5 + 0.5 * sin(t * (0.8 + hash1(fk * 9.0)) + fk)) * (0.4 + 0.8 * level) * (1.0 - aurora);
    float d = length(float2(x, y) - fp);
    col += float3(0.95, 0.9, 0.5) * (smoothstep(0.006, 0.0, d) + 0.25 * exp(-d * 60.0)) * glow;
  }
  float vig = smoothstep(1.3, 0.35, length((uv - 0.5) * float2(1.0, 1.3)));
  col *= mix(0.6, 1.0, vig);
  return half4(half3(grain(tonemap(col), fc)), 1.0);
}`;

/* ------------------------------------------------------------------ */
/* Sky of moving clouds over swaying grass (wind, wind chimes).         */
/* ------------------------------------------------------------------ */
export const CLOUDS = `${COMMON}
uniform float wind;  // cloud speed and grass sway

half4 main(float2 fc) {
  float2 uv = fc / iResolution;
  float aspect = iResolution.x / iResolution.y;
  float y = 1.0 - uv.y;
  float x = uv.x * aspect;
  float t = iTime;
  float w = wind * (0.6 + 0.8 * level);

  float3 col = mix(c2 * 1.2 + accent * 0.1, c0, smoothstep(0.1, 1.0, y));
  // Two warped cloud layers at different speeds (parallax).
  for (int i = 0; i < 2; i++) {
    float fi = float(i);
    float2 p = float2(x * (1.2 + fi), y * (2.2 + fi)) + float2(t * w * (0.05 + fi * 0.04), fi * 3.0);
    float2 warp = float2(fbm(p + t * 0.02), fbm(p + 4.0));
    float c = fbm(p + warp * 0.8);
    float cover = smoothstep(0.42, 0.75, c) * smoothstep(0.15, 0.6, y);
    float3 cc = mix(c1 * 1.3, mix(accent, float3(1.0), 0.4) * 0.9, smoothstep(0.5, 0.85, c));
    col = mix(col, cc, cover * (0.55 - fi * 0.15));
  }
  // Sparkles in the air on chime strikes.
  for (int k = 0; k < 4; k++) {
    float a = ages[k];
    float2 sp = float2(hash1(seeds[k] * 13.0) * aspect, 0.35 + 0.5 * hash1(seeds[k] * 7.0));
    float d = length(float2(x, y) - sp);
    float s = exp(-a * 1.5) * step(a, 6.0);
    col += accent * (smoothstep(0.012, 0.0, d) + 0.5 * exp(-d * 25.0)) * s;
  }
  // Grass blades swaying in the wind.
  float gx = x * 90.0;
  float id = floor(gx);
  float bladeH = 0.05 + 0.07 * hash1(id);
  float sway = sin(t * (1.0 + w) + id * 0.3) * 0.015 * (0.4 + w) * (y / max(bladeH, 0.001));
  float blade = step(abs(fract(gx + sway * 90.0) - 0.5), 0.18 * (1.0 - y / bladeH)) * step(y, bladeH);
  col = mix(col, c0 * 0.5, max(blade, smoothstep(0.03, 0.0, y)));
  float vig = smoothstep(1.3, 0.4, length((uv - 0.5) * float2(1.0, 1.3)));
  col *= mix(0.65, 1.0, vig);
  return half4(half3(grain(tonemap(col), fc)), 1.0);
}`;

/* ------------------------------------------------------------------ */
/* Soft drifting mist (white noise).                                    */
/* ------------------------------------------------------------------ */
export const MIST = `${COMMON}
half4 main(float2 fc) {
  float2 uv = fc / iResolution;
  float aspect = iResolution.x / iResolution.y;
  float2 p = float2(uv.x * aspect, uv.y);
  float t = iTime * 0.04;
  float3 col = grad3(uv.y);
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float2 q = p * (1.2 + fi * 0.8) + float2(t * (1.0 + fi), fi * 4.0);
    float m = fbm(q + fbm(q + t) * 0.8);
    col = mix(col, mix(c2, accent, 0.25) * 1.2, smoothstep(0.35, 0.85, m) * (0.25 + 0.06 * fi));
  }
  col *= 0.92 + 0.08 * level;
  float vig = smoothstep(1.2, 0.3, length(uv - 0.5));
  col *= mix(0.6, 1.0, vig);
  return half4(half3(grain(tonemap(col), fc)), 1.0);
}`;
