import {
  BricolageGrotesque_400Regular,
  BricolageGrotesque_500Medium,
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  InstrumentSans_400Regular,
  InstrumentSans_500Medium,
  InstrumentSans_600SemiBold,
  InstrumentSans_700Bold,
} from '@expo-google-fonts/instrument-sans';

/**
 * Font map for expo-font useFonts() loader.
 */
export const fontMap = {
  BricolageGrotesque_400Regular,
  BricolageGrotesque_500Medium,
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
  InstrumentSans_400Regular,
  InstrumentSans_500Medium,
  InstrumentSans_600SemiBold,
  InstrumentSans_700Bold,
};

/**
 * Exact font family names registered with React Native.
 */
export const FontFamily = {
  // Headings: Bricolage Grotesque
  headingRegular: 'BricolageGrotesque_400Regular',
  headingMedium: 'BricolageGrotesque_500Medium',
  headingSemiBold: 'BricolageGrotesque_600SemiBold',
  headingBold: 'BricolageGrotesque_700Bold',
  headingExtraBold: 'BricolageGrotesque_800ExtraBold',

  // Body & Numerical: Instrument Sans
  bodyRegular: 'InstrumentSans_400Regular',
  bodyMedium: 'InstrumentSans_500Medium',
  bodySemiBold: 'InstrumentSans_600SemiBold',
  bodyBold: 'InstrumentSans_700Bold',
} as const;

/**
 * Reusable Typography tokens for consistent application across the WattWise app.
 */
export const Typography = {
  fontFamily: FontFamily,

  // Screen titles, dashboard section headings, card titles, hero headings (Bricolage Grotesque)
  heading: {
    regular: {
      fontFamily: FontFamily.headingRegular,
    },
    medium: {
      fontFamily: FontFamily.headingMedium,
    },
    semiBold: {
      fontFamily: FontFamily.headingSemiBold,
    },
    bold: {
      fontFamily: FontFamily.headingBold,
    },
    extraBold: {
      fontFamily: FontFamily.headingExtraBold,
    },
  },

  // Body paragraphs, descriptions, navigation labels, metric labels, buttons, inputs (Instrument Sans)
  body: {
    regular: {
      fontFamily: FontFamily.bodyRegular,
    },
    medium: {
      fontFamily: FontFamily.bodyMedium,
    },
    semiBold: {
      fontFamily: FontFamily.bodySemiBold,
    },
    bold: {
      fontFamily: FontFamily.bodyBold,
    },
  },

  // Numerical energy readings and metric values (Instrument Sans for tabular clarity)
  number: {
    regular: {
      fontFamily: FontFamily.bodyRegular,
    },
    medium: {
      fontFamily: FontFamily.bodyMedium,
    },
    semiBold: {
      fontFamily: FontFamily.bodySemiBold,
    },
    bold: {
      fontFamily: FontFamily.bodyBold,
    },
  },
} as const;
