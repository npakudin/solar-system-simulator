export function add(a, b) {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}
export function subtract(a, b) {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}
export function multiply(v, s) {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}
export function dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}
export function cross(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x
  };
}
export function len(v) {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}
export function distance(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
export function normalize(v) {
  const l = len(v);
  return l === 0 ? { x: 0, y: 0, z: 0 } : { x: v.x / l, y: v.y / l, z: v.z / l };
}
export function normalizeOrFallback(v, fallback) {
  const n = normalize(v);
  return (n.x === 0 && n.y === 0 && n.z === 0) ? fallback : n;
}

export const Vec3 = { add, subtract, multiply, dot, cross, len, distance, normalize, normalizeOrFallback };
