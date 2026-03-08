import { useState, useCallback, useRef } from 'react';

const VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel

// Shared cache across all hook instances
const audioCache = new Map();
const MAX_CACHE = 25;

function cacheSet(key, blob) {
  if (audioCache.size >= MAX_CACHE) {
    const first = audioCache.keys().next().value;
    const url = audioCache.get(first)?.url;
    if (url) URL.revokeObjectURL(url);
    audioCache.delete(first);
  }
  const url = URL.createObjectURL(blob);
  audioCache.set(key, { blob, url });
  return url;
}

function playAudio(url, audioRef, setSpeaking) {
  const audio = new Audio(url);
  audioRef.current = audio;
  audio.onplay = () => setSpeaking(true);
  audio.onended = () => { setSpeaking(false); audioRef.current = null; };
  audio.onerror = (e) => {
    console.warn('Audio playback error:', e);
    setSpeaking(false);
    audioRef.current = null;
  };
  audio.play().catch((e) => {
    console.warn('Audio play() rejected:', e.message);
    setSpeaking(false);
    audioRef.current = null;
  });
}

export default function useSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const audioRef = useRef(null);
  const abortRef = useRef(null);

  const webSpeechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const supported = true; // always supported — server handles ElevenLabs, Web Speech as fallback

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    if (webSpeechSupported) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
    setLoading(false);
  }, [webSpeechSupported]);

  const speakWebSpeech = useCallback((text) => {
    if (!webSpeechSupported || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.92;
    utterance.pitch = 1.05;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      v.name.includes('Samantha') || v.name.includes('Karen') ||
      v.name.includes('Moira') || v.name.includes('Google US English')
    ) || voices.find(v => v.lang === 'en-US') || voices[0];
    if (preferred) utterance.voice = preferred;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, [webSpeechSupported]);

  const speakElevenLabs = useCallback(async (text) => {
    stop();

    const cached = audioCache.get(text);
    if (cached) {
      playAudio(cached.url, audioRef, setSpeaking);
      return;
    }

    setLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voiceId: VOICE_ID }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`Voice ${res.status}`);

      const blob = await res.blob();
      const url = cacheSet(text, blob);
      setLoading(false);
      playAudio(url, audioRef, setSpeaking);
    } catch (err) {
      setLoading(false);
      if (err.name !== 'AbortError') {
        console.warn('ElevenLabs TTS failed, falling back to Web Speech:', err.message);
        speakWebSpeech(text);
      }
    }
  }, [stop, speakWebSpeech]);

  const speak = useCallback((text) => {
    if (!text) return;
    speakElevenLabs(text);
  }, [speakElevenLabs]);

  return { speak, stop, speaking, loading, supported };
}
