/* eslint-env jest */
// jest.setup.js
jest.setTimeout(15000);

jest.mock('react-native-mmkv', () => {
  return {
    MMKV: jest.fn().mockImplementation(() => {
      const storage = new Map();
      return {
        set: jest.fn((key, value) => storage.set(key, value)),
        getString: jest.fn(key => storage.get(key)),
        getNumber: jest.fn(key => storage.get(key)),
        getBoolean: jest.fn(key => storage.get(key)),
        delete: jest.fn(key => storage.delete(key)),
        clearAll: jest.fn(() => storage.clear()),
      };
    }),
  };
});

jest.mock('react-native-screens', () => {
  const RN = require('react-native');
  return {
    enableScreens: jest.fn(),
    ScreenContainer: RN.View,
    Screen: RN.View,
    NativeScreen: RN.View,
    NativeScreenContainer: RN.View,
    ScreenStack: RN.View,
    ScreenStackHeaderConfig: RN.View,
    ScreenStackHeaderSubview: RN.View,
    SearchBar: RN.View,
  };
});

jest.mock('react-native-bootsplash', () => ({
  hide: jest.fn().mockResolvedValue(true),
  isVisible: jest.fn().mockResolvedValue(false),
  useHideAnimation: jest.fn().mockReturnValue({}),
}));

jest.mock('react-native-linear-gradient', () => {
  const RN = require('react-native');
  return RN.View;
});

jest.mock('react-native-pager-view', () => {
  const React = require('react');
  const RN = require('react-native');
  return class MockPagerView extends React.Component {
    setPage = jest.fn();
    render() {
      return React.createElement(RN.View, this.props, this.props.children);
    }
  };
});

jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const RN = require('react-native');
  return {
    __esModule: true,
    default: React.forwardRef((props, ref) => {
      React.useImperativeHandle(ref, () => ({
        expand: jest.fn(),
        close: jest.fn(),
        snapToIndex: jest.fn(),
      }));
      return React.createElement(RN.View, props, props.children);
    }),
    BottomSheetModal: React.forwardRef((props, ref) => {
      React.useImperativeHandle(ref, () => ({
        present: jest.fn(),
        dismiss: jest.fn(),
      }));
      return React.createElement(RN.View, props, props.children);
    }),
    BottomSheetView: ({ children, ...props }) => React.createElement(RN.View, props, children),
    BottomSheetScrollView: ({ children, ...props }) => React.createElement(RN.View, props, children),
    BottomSheetBackdrop: () => null,
    BottomSheetModalProvider: ({ children }) => children,
    useBottomSheetModal: () => ({
      present: jest.fn(),
      dismiss: jest.fn(),
    }),
  };
});

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const RN = require('react-native');
  return {
    GestureHandlerRootView: ({ children, ...props }) => React.createElement(RN.View, props, children),
    PanGestureHandler: RN.View,
    TapGestureHandler: RN.View,
    State: {},
    Directions: {},
  };
});
