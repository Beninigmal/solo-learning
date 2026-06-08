import { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

let globalMuted = false;

// Async load once when the module imports
AsyncStorage.getItem('@Solen:muted').then(val => {
  if (val === 'true') {
    globalMuted = true;
  }
});

/**
 * Hook centralizado de sons do Solen.
 *
 * Métodos disponíveis:
 *   playLogin()          – Som de loading de login (loop)
 *   stopLogin()          – Para o som de loading
 *   playSuccess()        – Acerto de questão
 *   playFail()           – Erro de questão
 *   playMission()        – Nova missão recebida
 *   playError()          – Erro de validação / API
 *   playIntro()          – Sweep de transição (entrada de telas internas)
 *   playIntroMusic()     – Música completa de intro (login screen)
 *   fadeOutIntroMusic()  – Fade-out suave da música de intro
 *   isMuted()            - Retorna se os sons estão mutados
 *   setMuted(m)          - Muda o estado mutado e interrompe sons ativos
 */
export function useSolenSounds() {
  const loginSoundRef     = useRef<Audio.Sound | null>(null);
  const successSoundRef   = useRef<Audio.Sound | null>(null);
  const failSoundRef      = useRef<Audio.Sound | null>(null);
  const missionSoundRef   = useRef<Audio.Sound | null>(null);
  const errorSoundRef     = useRef<Audio.Sound | null>(null);
  const introSoundRef     = useRef<Audio.Sound | null>(null);
  const introMusicRef     = useRef<Audio.Sound | null>(null);
  const animationSoundRef = useRef<Audio.Sound | null>(null);
  const selectSoundRef    = useRef<Audio.Sound | null>(null);
  const rankUpSoundRef    = useRef<Audio.Sound | null>(null);
  const burnArtefactSoundRef = useRef<Audio.Sound | null>(null);
  const bossArenaSoundRef  = useRef<Audio.Sound | null>(null);
  const introMusicVolRef  = useRef<number>(1.0);
  const fadeIntervalRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  const [localMuted, setLocalMuted] = useState(globalMuted);

  // Sync initial state
  useEffect(() => {
    setLocalMuted(globalMuted);
  }, []);

  const getMuted = useCallback(() => {
    return globalMuted;
  }, []);

  const changeMuted = useCallback(async (mute: boolean) => {
    globalMuted = mute;
    setLocalMuted(mute);
    await AsyncStorage.setItem('@Solen:muted', String(mute));

    if (mute) {
      // Interrompe sons contínuos
      try {
        if (loginSoundRef.current) {
          await loginSoundRef.current.stopAsync();
          await loginSoundRef.current.unloadAsync();
          loginSoundRef.current = null;
        }
        if (introMusicRef.current) {
          await introMusicRef.current.stopAsync();
          await introMusicRef.current.unloadAsync();
          introMusicRef.current = null;
        }
      } catch (err) {
        console.warn('[SolenSounds] Erro ao silenciar sons ativos:', err);
      }
    }
  }, []);

  /** Helper: cria e toca um som de uso único (descarrega ao terminar) */
  const playOneShot = useCallback(async (
    ref: React.MutableRefObject<Audio.Sound | null>,
    source: any,
    volume = 0.85
  ) => {
    if (globalMuted) return;
    try {
      if (ref.current) {
        await ref.current.unloadAsync();
        ref.current = null;
      }
      const { sound } = await Audio.Sound.createAsync(source, { shouldPlay: true, volume });
      ref.current = sound;
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
          ref.current = null;
        }
      });
    } catch (e) {
      console.warn('[SolenSounds] Erro ao tocar som:', e);
    }
  }, []);

  /** Toca o som de login em loop enquanto o loading roda */
  const playLogin = useCallback(async () => {
    try {
      if (loginSoundRef.current) {
        await loginSoundRef.current.unloadAsync();
        loginSoundRef.current = null;
      }
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/login.wav'),
        { shouldPlay: true, isLooping: true, volume: 0.7 }
      );
      loginSoundRef.current = sound;
    } catch (e) {
      console.warn('[SolenSounds] Erro ao tocar login.wav:', e);
    }
  }, []);

  /** Para e descarrega o som de login */
  const stopLogin = useCallback(async () => {
    try {
      if (loginSoundRef.current) {
        await loginSoundRef.current.stopAsync();
        await loginSoundRef.current.unloadAsync();
        loginSoundRef.current = null;
      }
    } catch (e) {
      console.warn('[SolenSounds] Erro ao parar login.wav:', e);
    }
  }, []);

  const playSuccess = useCallback(
    () => playOneShot(successSoundRef, require('../assets/success_question.wav'), 0.85),
    [playOneShot]
  );

  const playFail = useCallback(
    () => playOneShot(failSoundRef, require('../assets/fail_question.wav'), 0.85),
    [playOneShot]
  );

  const playMission = useCallback(
    () => playOneShot(missionSoundRef, require('../assets/mission_notification.wav'), 0.9),
    [playOneShot]
  );

  /** Erro de validação / API (batida grave) */
  const playError = useCallback(
    () => playOneShot(errorSoundRef, require('../assets/error.wav'), 0.75),
    [playOneShot]
  );

  /** Sweep de transição – usado nas telas internas (status, dashboards) */
  const playIntro = useCallback(
    () => playOneShot(introSoundRef, require('../assets/animation.wav'), 0.6),
    [playOneShot]
  );

  /**
   * Som sincronizado com a animação de splash (index.tsx).
   * Arquivo: animation.wav — definido pelo usuário para a tela de intro.
   */
  const playAnimation = useCallback(
    () => playOneShot(animationSoundRef, require('../assets/animation.wav'), 0.85),
    [playOneShot]
  );

  /** Som para botões de seleção (opções, abas, turmas, disciplinas) */
  const playSelect = useCallback(
    () => playOneShot(selectSoundRef, require('../assets/select.wav'), 0.7),
    [playOneShot]
  );

  const playRankUp = useCallback(
    () => playOneShot(rankUpSoundRef, require('../assets/rank_up.mp3'), 0.95),
    [playOneShot]
  );

  const playBurnArtefact = useCallback(
    () => playOneShot(burnArtefactSoundRef, require('../assets/burn_artefact.wav'), 0.9),
    [playOneShot]
  );

  /** Toca boss_arena.mp3 em loop enquanto a missão de boss estiver aberta */
  const playBossArena = useCallback(async (volume = 0.7) => {
    try {
      if (bossArenaSoundRef.current) return; // já tocando
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/boss_arena.mp3'),
        { shouldPlay: true, isLooping: true, volume }
      );
      bossArenaSoundRef.current = sound;
    } catch (e) {
      console.warn('[SolenSounds] Erro ao tocar boss_arena.mp3:', e);
    }
  }, []);

  /** Para e descarrega a música de boss arena */
  const stopBossArena = useCallback(async () => {
    try {
      if (bossArenaSoundRef.current) {
        await bossArenaSoundRef.current.stopAsync();
        await bossArenaSoundRef.current.unloadAsync();
        bossArenaSoundRef.current = null;
      }
    } catch (e) {
      console.warn('[SolenSounds] Erro ao parar boss_arena.mp3:', e);
    }
  }, []);

  /**
   * Inicia a música completa de intro (intro.mp3) na tela de login.
   * Toca uma única vez, do começo ao fim (sem loop).
   * volume: volume inicial (0.0 – 1.0)
   */
  const playIntroMusic = useCallback(async (volume = 0.8) => {
    try {
      // Cancela qualquer fade em andamento
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
        fadeIntervalRef.current = null;
      }
      if (introMusicRef.current) {
        await introMusicRef.current.unloadAsync();
        introMusicRef.current = null;
      }
      introMusicVolRef.current = volume;

      const { sound } = await Audio.Sound.createAsync(
        require('../assets/intro.mp3'),
        { shouldPlay: true, isLooping: false, volume }
      );
      introMusicRef.current = sound;

      // Descarrega automaticamente quando terminar
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
          introMusicRef.current = null;
        }
      });
    } catch (e) {
      console.warn('[SolenSounds] Erro ao tocar intro.mp3:', e);
    }
  }, []);

  /**
   * Fade-out suave da música de intro.
   * durationMs: duração do fade em milissegundos (padrão 1500ms)
   * Ao término do fade, para e descarrega o som.
   */
  const fadeOutIntroMusic = useCallback(async (durationMs = 1500) => {
    if (!introMusicRef.current) return;

    // Cancela fade anterior se existir
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }

    const steps = 30; // 30 passos de redução
    const interval = durationMs / steps;
    const volumeStep = introMusicVolRef.current / steps;

    fadeIntervalRef.current = setInterval(async () => {
      introMusicVolRef.current = Math.max(0, introMusicVolRef.current - volumeStep);
      try {
        if (introMusicRef.current) {
          await introMusicRef.current.setVolumeAsync(introMusicVolRef.current);
        }
      } catch (_) {}

      if (introMusicVolRef.current <= 0) {
        clearInterval(fadeIntervalRef.current!);
        fadeIntervalRef.current = null;
        try {
          if (introMusicRef.current) {
            await introMusicRef.current.stopAsync();
            await introMusicRef.current.unloadAsync();
            introMusicRef.current = null;
          }
        } catch (_) {}
      }
    }, interval);
  }, []);

  return useMemo(() => ({
    playLogin,
    stopLogin,
    playSuccess,
    playFail,
    playMission,
    playError,
    playIntro,
    playAnimation,
    playSelect,
    playIntroMusic,
    fadeOutIntroMusic,
    playRankUp,
    playBurnArtefact,
    playBossArena,
    stopBossArena,
    isMuted: getMuted,
    setMuted: changeMuted,
    muted: localMuted
  }), [
    playLogin,
    stopLogin,
    playSuccess,
    playFail,
    playMission,
    playError,
    playIntro,
    playAnimation,
    playSelect,
    playIntroMusic,
    fadeOutIntroMusic,
    playRankUp,
    playBurnArtefact,
    playBossArena,
    stopBossArena,
    getMuted,
    changeMuted,
    localMuted
  ]);
}
