import { useCallback, useEffect, useRef, useState } from "react";

let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  try {
    if (!audioCtx) {
      audioCtx = new AudioContext();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

export function unlockAudio() {
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      ctx.resume();
    }
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
    console.log("[TTS] Unlocked, state:", ctx.state);
  } catch (e) {
    console.warn("[TTS] Unlock failed:", e);
  }
}

function concatBuffers(buffers: ArrayBuffer[]): ArrayBuffer {
  const total = buffers.reduce((acc, b) => acc + b.byteLength, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const buf of buffers) {
    merged.set(new Uint8Array(buf), offset);
    offset += buf.byteLength;
  }
  return merged.buffer;
}

export function useTTS() {
  const [isPlaying, setIsPlaying] = useState(false);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const chunksRef = useRef<ArrayBuffer[]>([]);

  const stop = useCallback(() => {
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch {}
      sourceRef.current = null;
    }
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.src = "";
      audioElRef.current = null;
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const playViaWebAudio = useCallback(
    async (buf: ArrayBuffer): Promise<boolean> => {
      const ctx = getAudioCtx();
      if (!ctx) return false;
      try {
        const decoded = await ctx.decodeAudioData(buf);
        const source = ctx.createBufferSource();
        source.buffer = decoded;
        source.connect(ctx.destination);
        source.onended = () => {
          setIsPlaying(false);
          sourceRef.current = null;
        };
        source.start();
        sourceRef.current = source;
        setIsPlaying(true);
        console.log("[TTS] Playing via WebAudio, duration:", decoded.duration);
        return true;
      } catch (e) {
        console.warn("[TTS] WebAudio failed:", e);
        return false;
      }
    },
    []
  );

  const playViaElement = useCallback(
    (blob: Blob): boolean => {
      try {
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        const audio = new Audio(url);
        audioElRef.current = audio;
        audio.onended = () => {
          setIsPlaying(false);
          URL.revokeObjectURL(url);
          urlRef.current = null;
          audioElRef.current = null;
        };
        audio.onerror = () => {
          console.warn("[TTS] Audio element error");
          setIsPlaying(false);
          URL.revokeObjectURL(url);
          urlRef.current = null;
          audioElRef.current = null;
        };
        const p = audio.play();
        if (p) {
          p.then(() => {
            console.log("[TTS] Playing via HTMLAudioElement");
            setIsPlaying(true);
          }).catch((e) => {
            console.warn("[TTS] HTMLAudioElement play() blocked:", e.message);
            setIsPlaying(false);
          });
        }
        return true;
      } catch (e) {
        console.warn("[TTS] HTMLAudioElement failed:", e);
        return false;
      }
    },
    []
  );

  const play = useCallback(async () => {
    const count = chunksRef.current.length;
    console.log("[TTS] play() called with", count, "chunks");
    if (count === 0) {
      console.warn("[TTS] No chunks!");
      return;
    }
    stop();

    const buf = concatBuffers(chunksRef.current);
    console.log("[TTS] Buffer:", buf.byteLength, "bytes");

    // Try WebAudio first (works without user gesture if context was unlocked)
    const webAudioOk = await playViaWebAudio(buf);
    if (webAudioOk) return;

    // Fallback: HTMLAudioElement (may need user gesture in Chrome)
    console.log("[TTS] Falling back to HTMLAudioElement");
    const blob = new Blob(chunksRef.current, { type: "audio/wav" });
    playViaElement(blob);
  }, [stop, playViaWebAudio, playViaElement]);

  const pushChunk = useCallback((chunk: ArrayBuffer) => {
    chunksRef.current.push(chunk);
  }, []);

  const clearChunks = useCallback(() => {
    chunksRef.current = [];
  }, []);

  const flush = useCallback(() => {
    play();
  }, [play]);

  useEffect(() => () => stop(), [stop]);

  return { isPlaying, pushChunk, clearChunks, flush, stop };
}
