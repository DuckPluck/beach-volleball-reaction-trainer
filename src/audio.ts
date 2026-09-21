import type { Preferences } from "./model";
let context: AudioContext | undefined;
export async function unlockAudio() {
  try {
    context ??= new AudioContext();
    if (context.state === "suspended") await context.resume();
  } catch {
    /* Audio is optional; the visual cue remains available. */
  }
}
export function beep(prefs: Preferences, kind: "cue" | "click" = "cue") {
  if (
    !prefs[kind] ||
    prefs.volume === 0 ||
    !context ||
    context.state !== "running"
  )
    return;
  const oscillator = context.createOscillator(),
    gain = context.createGain(),
    now = context.currentTime;
  oscillator.frequency.value = kind === "cue" ? 880 : 540;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime((prefs.volume / 100) * 0.16, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.09);
  oscillator.onended = () => {
    oscillator.disconnect();
    gain.disconnect();
  };
}
