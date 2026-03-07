import { useState, useEffect, useRef, useCallback } from 'react';

const SOUND_CONFIGS = {
  campfire: { type: 'crackle', baseFreq: 200, volume: 0.08 },
  ocean: { type: 'wave', baseFreq: 100, volume: 0.06 },
  wind: { type: 'noise', baseFreq: 400, volume: 0.04 },
  rain: { type: 'noise', baseFreq: 800, volume: 0.05 },
  birds: { type: 'chirp', baseFreq: 2000, volume: 0.03 },
  cave_drip: { type: 'drip', baseFreq: 600, volume: 0.04 },
  river: { type: 'wave', baseFreq: 150, volume: 0.05 },
};

export default function useAmbientSound() {
  const [enabled, setEnabled] = useState(() => {
    try { return localStorage.getItem('wayfinder_ambient_sound') === 'true'; }
    catch { return false; }
  });
  const [currentSound, setCurrentSound] = useState(null);
  const ctxRef = useRef(null);
  const nodesRef = useRef([]);

  const stop = useCallback(() => {
    nodesRef.current.forEach(node => {
      try { node.disconnect(); } catch {}
    });
    nodesRef.current = [];
    setCurrentSound(null);
  }, []);

  const play = useCallback((soundType) => {
    if (!enabled || !soundType || !SOUND_CONFIGS[soundType]) return;
    stop();

    try {
      if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = ctxRef.current;
      const config = SOUND_CONFIGS[soundType];
      const gain = ctx.createGain();
      gain.gain.value = config.volume;
      gain.connect(ctx.destination);

      const bufferSize = 2 * ctx.sampleRate;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = config.baseFreq;
      filter.Q.value = 0.5;

      noise.connect(filter);
      filter.connect(gain);
      noise.start();

      nodesRef.current = [noise, filter, gain];
      setCurrentSound(soundType);
    } catch (e) {
      console.warn('Ambient sound error:', e);
    }
  }, [enabled, stop]);

  const toggle = useCallback(() => {
    const next = !enabled;
    setEnabled(next);
    localStorage.setItem('wayfinder_ambient_sound', String(next));
    if (!next) stop();
  }, [enabled, stop]);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return { enabled, toggle, play, stop, currentSound };
}
