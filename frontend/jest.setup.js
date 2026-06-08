import jestMock from 'jest-mock';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => {
  let store = {};
  return {
    getItem: jest.fn((key) => {
      return Promise.resolve(store[key] || null);
    }),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
      return Promise.resolve(null);
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
      return Promise.resolve(null);
    }),
    clear: jest.fn(() => {
      store = {};
      return Promise.resolve(null);
    }),
  };
});

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  registerPushToken: jest.fn(),
  getPendingGiftedArtifacts: jest.fn(),
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
}));

// Mock expo-image-picker
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  launchImageLibraryAsync: jest.fn(() => Promise.resolve({ canceled: true, assets: [] })),
}));

// Mock expo-av
jest.mock('expo-av', () => ({
  Audio: {
    Sound: jest.fn().mockImplementation(() => ({
      loadAsync: jest.fn(),
      unloadAsync: jest.fn(),
      playAsync: jest.fn(),
      setPositionAsync: jest.fn(),
      setVolumeAsync: jest.fn(),
    })),
  },
}));

// Mock vector icons
jest.mock('@expo/vector-icons', () => ({
  Feather: 'Feather',
  Ionicons: 'Ionicons',
}));
