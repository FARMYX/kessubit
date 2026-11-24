import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

export type SoundName = 'chime' | 'pop' | 'success' | 'verify' | 'offer' | 'receipt';

// Original short sounds generated for the KESUUBIT theme.
const SOURCES: Record<SoundName, number> = {
  chime: require('../../assets/sounds/kessoku_chime.wav'),
  pop: require('../../assets/sounds/kessoku-pop.wav'),
  success: require('../../assets/sounds/kessoku-success.wav'),
  verify: require('../../assets/sounds/kessoku-verify.wav'),
  offer: require('../../assets/sounds/kessoku-offer.wav'),
  receipt: require('../../assets/sounds/kessoku-receipt.wav'),
};

const PREF_KEY = 'kessoku_sound_v1';
const players: Partial<Record<SoundName, AudioPlayer>> = {};
let audioModeReady = false;
let enabled = true;

AsyncStorage.getItem(PREF_KEY)
  .then((value) => {
    if (value === 'off') enabled = false;
  })
  .catch(() => {});

export const isSoundEnabled = () => enabled;

export async function setSoundEnabled(next: boolean) {
  enabled = next;
  await AsyncStorage.setItem(PREF_KEY, next ? 'on' : 'off').catch(() => {});
}

async function prepareAudio() {
  if (audioModeReady) return;
  audioModeReady = true;
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
    });
  } catch {
    // Audio is a nice-to-have; never block the UI on it.
  }
}

function playerFor(name: SoundName) {
  if (!players[name]) {
    players[name] = createAudioPlayer(SOURCES[name], { updateInterval: 500 });
  }
  return players[name]!;
}

/**
 * Plays a short UI sound. Safe to call on web and on native, and safe to call
 * repeatedly: the player rewinds before playing so fast taps do not get lost.
 */
export async function playSound(name: SoundName = 'chime') {
  if (!enabled) return;
  try {
    await prepareAudio();
    const player = playerFor(name);
    try {
      await player.seekTo(0);
    } catch {
      // The player may still be loading; play() will start it when ready.
    }
    player.play();
  } catch {
    // Ignore autoplay/policy errors.
  }
}

export function releaseSounds() {
  (Object.keys(players) as SoundName[]).forEach((key) => {
    try {
      players[key]?.remove();
    } catch {}
    delete players[key];
  });
}

/** Profile-level preference for the themed UI sounds. */
export function useSoundEnabled() {
  const [on, setOn] = useState(isSoundEnabled());

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(PREF_KEY)
      .then((value) => {
        if (alive) setOn(value !== 'off');
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const toggle = useCallback(async () => {
    const next = !on;
    setOn(next);
    await setSoundEnabled(next);
    if (next) playSound('pop');
  }, [on]);

  return { on, toggle };
}
