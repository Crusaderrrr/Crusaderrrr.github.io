// iOS only allows audio after a user gesture, so the context is created on a set tick
// (unlockAudio) and reused when the rest timer ends.
let ctx: AudioContext | null = null;

export function unlockAudio() {
  ctx ??= new AudioContext();
  void ctx.resume();
}

export function beep() {
  if (!ctx) return;
  const t = ctx.currentTime;
  for (let i = 0; i < 3; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.3, t + i * 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.3 + 0.2);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t + i * 0.3);
    osc.stop(t + i * 0.3 + 0.2);
  }
}
