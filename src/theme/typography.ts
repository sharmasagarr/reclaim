import { TextStyle } from 'react-native';

export const typography: Record<string, TextStyle> = {
  h1: {
    fontFamily: 'GoogleSans-Bold',
    fontSize: 22,
    letterSpacing: -0.3,
  },
  h2: {
    fontFamily: 'GoogleSans-SemiBold',
    fontSize: 18,
    letterSpacing: -0.2,
  },
  h3: {
    fontFamily: 'GoogleSans-SemiBold',
    fontSize: 15,
    letterSpacing: -0.1,
  },
  body: {
    fontFamily: 'GoogleSans-Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  bodyBold: {
    fontFamily: 'GoogleSans-SemiBold',
    fontSize: 13,
    lineHeight: 18,
  },
  caption: {
    fontFamily: 'GoogleSans-Regular',
    fontSize: 11,
    lineHeight: 15,
  },
  captionBold: {
    fontFamily: 'GoogleSans-Medium',
    fontSize: 11,
    lineHeight: 15,
  },
  statNumber: {
    fontFamily: 'GoogleSans-Bold',
    fontSize: 28,
    letterSpacing: -0.5,
  },
  badge: {
    fontFamily: 'GoogleSans-Bold',
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
};
