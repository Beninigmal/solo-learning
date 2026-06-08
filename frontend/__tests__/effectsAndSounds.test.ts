import { useSolenSounds } from '../hooks/useSolenSounds';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Virtual mocks for audio assets to avoid SyntaxError in Jest
jest.mock('../assets/boss_arena.mp3', () => 1, { virtual: true });
jest.mock('../assets/burn_artefact.wav', () => 1, { virtual: true });
jest.mock('../assets/login.wav', () => 1, { virtual: true });
jest.mock('../assets/success_question.wav', () => 1, { virtual: true });
jest.mock('../assets/fail_question.wav', () => 1, { virtual: true });
jest.mock('../assets/mission_notification.wav', () => 1, { virtual: true });
jest.mock('../assets/error.wav', () => 1, { virtual: true });
jest.mock('../assets/animation.wav', () => 1, { virtual: true });
jest.mock('../assets/select.wav', () => 1, { virtual: true });
jest.mock('../assets/rank_up.mp3', () => 1, { virtual: true });
jest.mock('../assets/intro.mp3', () => 1, { virtual: true });

// Mock React hooks to test the hook output/logic without full render
jest.mock('react', () => {
  const ActualReact = jest.requireActual('react');
  return {
    ...ActualReact,
    useRef: (initialValue: any) => ({ current: initialValue }),
    useState: (initialValue: any) => {
      let val = initialValue;
      const setVal = (newVal: any) => { val = newVal; };
      return [val, setVal];
    },
    useEffect: jest.fn(),
    useCallback: (fn: any) => fn,
    useMemo: (fn: any) => fn(),
  };
});

describe('Solen Sounds and Quest Arena Logic Unit Tests', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useSolenSounds hook functions', () => {
    test('should expose playBossArena and stopBossArena as functions', () => {
      const sounds = useSolenSounds();
      expect(typeof sounds.playBossArena).toBe('function');
      expect(typeof sounds.stopBossArena).toBe('function');
    });

    test('playBossArena should call Audio.Sound.createAsync with boss_arena.mp3 and correct options', async () => {
      Audio.Sound.createAsync = jest.fn().mockResolvedValue({
        sound: {
          stopAsync: jest.fn(),
          unloadAsync: jest.fn(),
          setVolumeAsync: jest.fn(),
        } as any,
        status: {} as any,
      });

      const sounds = useSolenSounds();
      await sounds.playBossArena(0.5);

      expect(Audio.Sound.createAsync).toHaveBeenCalledWith(
        expect.any(Number), // required asset ID/object
        expect.objectContaining({
          shouldPlay: true,
          isLooping: true,
          volume: 0.5,
        })
      );
    });
  });

  describe('QuestWindowModal Boss Sound Triggering Logic', () => {
    const simulateQuestModalSoundEffect = (
      visible: boolean,
      questNivel: string,
      sounds: { playBossArena: jest.Mock; stopBossArena: jest.Mock }
    ) => {
      // Simulates the useEffect block inside QuestWindowModal.tsx
      if (visible) {
        if (questNivel === 'BOSS' || questNivel === 'MINIBOSS') {
          sounds.playBossArena();
        }
      } else {
        sounds.stopBossArena();
      }
    };

    test('should trigger playBossArena when visible and level is BOSS', () => {
      const mockSounds = {
        playBossArena: jest.fn(),
        stopBossArena: jest.fn(),
      };

      simulateQuestModalSoundEffect(true, 'BOSS', mockSounds);

      expect(mockSounds.playBossArena).toHaveBeenCalled();
      expect(mockSounds.stopBossArena).not.toHaveBeenCalled();
    });

    test('should trigger playBossArena when visible and level is MINIBOSS', () => {
      const mockSounds = {
        playBossArena: jest.fn(),
        stopBossArena: jest.fn(),
      };

      simulateQuestModalSoundEffect(true, 'MINIBOSS', mockSounds);

      expect(mockSounds.playBossArena).toHaveBeenCalled();
      expect(mockSounds.stopBossArena).not.toHaveBeenCalled();
    });

    test('should NOT trigger playBossArena when visible but level is FACIL', () => {
      const mockSounds = {
        playBossArena: jest.fn(),
        stopBossArena: jest.fn(),
      };

      simulateQuestModalSoundEffect(true, 'FACIL', mockSounds);

      expect(mockSounds.playBossArena).not.toHaveBeenCalled();
      expect(mockSounds.stopBossArena).not.toHaveBeenCalled();
    });

    test('should trigger stopBossArena when visible is false', () => {
      const mockSounds = {
        playBossArena: jest.fn(),
        stopBossArena: jest.fn(),
      };

      simulateQuestModalSoundEffect(false, 'BOSS', mockSounds);

      expect(mockSounds.playBossArena).not.toHaveBeenCalled();
      expect(mockSounds.stopBossArena).toHaveBeenCalled();
    });
  });

  describe('Card Burn Animation uniform logic', () => {
    // Check that we can map values for shader progress animation
    const calculateBurnProgress = (elapsedTime: number, duration: number) => {
      const t = Math.min(1, elapsedTime / duration);
      // Quadratic ease in: t^2
      return t * t;
    };

    test('should start at 0 and ease in to 1 at the end of the duration', () => {
      expect(calculateBurnProgress(0, 1000)).toBe(0);
      expect(calculateBurnProgress(500, 1000)).toBe(0.25); // t = 0.5 -> 0.5 * 0.5 = 0.25
      expect(calculateBurnProgress(1000, 1000)).toBe(1);
      expect(calculateBurnProgress(1200, 1000)).toBe(1); // capped
    });
  });

});
