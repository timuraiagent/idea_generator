// ===== звук: синтез на WebAudio. Музыки нет: тихий гул подвала и короткие сигналы, каждый что-то значит =====
const SND = (() => { let ac = null, master = null, hum = null, noiseBuf = null;
  function ensure() { if (ac) { if (ac.state === 'suspended') ac.resume(); return true; }
    try { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false; ac = new AC(); master = ac.createGain(); master.gain.value = save.sound ? 0.9 : 0; master.connect(ac.destination);
      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const d = noiseBuf.getChannelData(0); let b = 0; for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; b = (b + 0.04 * w) / 1.04; d[i] = w * 0.5 + b * 6; }
      startHum(); return true; } catch (e) { ac = null; return false; } }
  function startHum() { const src = ac.createBufferSource(); src.buffer = noiseBuf; src.loop = true; const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 140; hum = ac.createGain(); hum.gain.value = 0.05; src.connect(f); f.connect(hum); hum.connect(master); src.start(); }
  function tone(freq, dur, type, vol, when, slideTo) { if (!ac) return; const t = ac.currentTime + (when || 0), o = ac.createOscillator(), g = ac.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t); if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.03); }
  function noise(dur, vol, type, f0, f1, when, q) { if (!ac) return; const t = ac.currentTime + (when || 0), src = ac.createBufferSource(); src.buffer = noiseBuf; src.loop = true; const f = ac.createBiquadFilter(); f.type = type || 'lowpass'; f.Q.value = q || 0.8; f.frequency.setValueAtTime(f0, t); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); src.connect(f); f.connect(g); g.connect(master); src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05); }
  const S = {
    step() { noise(0.07, 0.16, 'lowpass', 520, 180); },                                   // шаг: мягкий стук
    hiss() { noise(0.16, 0.05, 'highpass', 5200, 3400, 0.03); },                           // шипение фитиля — «часы» игры
    fall() { noise(0.34, 0.3, 'lowpass', 420, 60, 0.02); tone(70, 0.3, 'sine', 0.22, 0.03, 38); },   // обвал пола
    lamp() { noise(0.22, 0.14, 'bandpass', 700, 2400, 0, 1.4); tone(660, 0.5, 'sine', 0.14, 0.05); tone(990, 0.6, 'sine', 0.08, 0.09); },   // лампа зажглась
    oil() { noise(0.4, 0.26, 'bandpass', 300, 1800, 0, 0.9); },                            // масло вспыхнуло
    wood() { for (let i = 0; i < 6; i++) noise(0.03, 0.18, 'highpass', 2200 + Math.random() * 2000, 0, i * 0.045 + Math.random() * 0.02); noise(0.32, 0.14, 'bandpass', 400, 1200); },   // доски трещат
    wake() { tone(392, 0.11, 'square', 0.07); tone(587, 0.2, 'square', 0.07, 0.11); },     // страж проснулся
    guardDown() { noise(0.3, 0.2, 'lowpass', 900, 120); tone(196, 0.3, 'triangle', 0.1, 0, 98); },
    door() { tone(523, 0.5, 'sine', 0.12); tone(659, 0.55, 'sine', 0.1, 0.07); tone(784, 0.7, 'sine', 0.09, 0.14); },   // дверь открылась
    doorShut() { tone(294, 0.18, 'triangle', 0.1, 0, 196); },
    spool() { tone(880, 0.09, 'triangle', 0.12); tone(1175, 0.16, 'triangle', 0.12, 0.08); },
    steam() { noise(0.3, 0.1, 'highpass', 3000, 6000); },                                  // огонёк зашипел в воде
    nope() { tone(180, 0.09, 'square', 0.06); },                                           // туда нельзя
    fail() { noise(0.18, 0.3, 'lowpass', 300, 70); tone(220, 0.34, 'sawtooth', 0.09, 0.02, 82); },   // провал: резко и коротко
    win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.34, 'triangle', 0.14, i * 0.09)); tone(1568, 0.7, 'sine', 0.07, 0.36); },
    star() { tone(1320, 0.18, 'sine', 0.1); },
    click() { tone(520, 0.05, 'triangle', 0.08); },
    undo() { tone(420, 0.07, 'triangle', 0.08, 0, 300); },
    hint() { tone(740, 0.12, 'sine', 0.1); tone(988, 0.2, 'sine', 0.1, 0.1); },
  };
  const api = { unlock: ensure, play(name, delayMs) { if (!save.sound) return; if (!ensure()) return; if (delayMs) setTimeout(() => S[name] && S[name](), delayMs); else S[name] && S[name](); },
    setOn(on) { save.sound = on; persist(); if (master) master.gain.value = on ? 0.9 : 0; if (on) ensure(); }, names: Object.keys(S) };
  return api; })();
