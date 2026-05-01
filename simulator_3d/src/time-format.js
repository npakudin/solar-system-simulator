export function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return "n/a";
  if (seconds < 120) return `${seconds.toFixed(0)}s`;
  if (seconds < 3 * 3600) return `${(seconds / 60).toFixed(1)}m`;
  return `${(seconds / 3600).toFixed(1)}h`;
}

export function formatElapsedTime(totalSeconds) {
  const s = Math.floor(totalSeconds % 60);
  const m = Math.floor(totalSeconds / 60) % 60;
  const h = Math.floor(totalSeconds / 3600) % 24;
  const d = Math.floor(totalSeconds / 86400) % 365;
  const y = Math.floor(totalSeconds / (365.25 * 86400));
  if (y > 0) return `${y}y ${d}d ${h}h ${m}m ${s}s`;
  if (d > 0) return `${d}d ${h}h ${m}m ${s}s`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function formatCountdown(remainingSeconds) {
  if (remainingSeconds <= 0) return 'GO';
  const h = Math.floor(remainingSeconds / 3600);
  const m = Math.floor((remainingSeconds % 3600) / 60);
  const s = Math.floor(remainingSeconds % 60);
  const pad = n => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function formatDist(meters) {
  if (meters < 1e6) return `${(meters / 1e3).toFixed(0)} km`;
  if (meters < 1e9) return `${(meters / 1e6).toFixed(1)} Mm`;
  if (meters < 1e12) return `${(meters / 1e9).toFixed(2)} Gm`;
  return `${(meters / 1e12).toFixed(2)} Tm`;
}

export function formatCommand(missionStatus) {
  const name = missionStatus.commandName || "idle";
  if (Number.isFinite(missionStatus.commandStart) && Number.isFinite(missionStatus.commandEnd)) {
    return `${name} (${missionStatus.commandStart.toFixed(0)}-${missionStatus.commandEnd.toFixed(0)}s)`;
  }
  return name;
}

export function firstBurnText(mission) {
  const first = (mission.program || []).find((burn) => (burn.throttle || 0) > 0);
  return first ? `${first.name} at ${formatDuration(first.start)}` : "none";
}

export const TimeFormat = { formatDuration, formatElapsedTime, formatCountdown, formatDist, formatCommand, firstBurnText };
