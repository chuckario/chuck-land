export function hashNoise(x: number, y: number): number {
  const value = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

export function tileHash(x: number, y: number): number {
  return (x * 374761 + y * 668265) | 0;
}

export function fbm(x: number, y: number, octaves = 4): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;

  for (let octave = 0; octave < octaves; octave += 1) {
    value += amplitude * hashNoise(x * frequency, y * frequency);
    amplitude *= 0.5;
    frequency *= 2;
  }

  return value;
}
