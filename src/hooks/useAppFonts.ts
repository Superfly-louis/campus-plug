import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
} from '@expo-google-fonts/dm-sans';
import {
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { useFonts } from 'expo-font';

import { fontFamily } from '@/constants/theme';

export function useAppFonts() {
  return useFonts({
    [fontFamily.jakartaSemiBold]: PlusJakartaSans_600SemiBold,
    [fontFamily.jakartaBold]: PlusJakartaSans_700Bold,
    [fontFamily.jakartaExtraBold]: PlusJakartaSans_800ExtraBold,
    [fontFamily.dmRegular]: DMSans_400Regular,
    [fontFamily.dmMedium]: DMSans_500Medium,
    [fontFamily.dmSemiBold]: DMSans_600SemiBold,
  });
}
