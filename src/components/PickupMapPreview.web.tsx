import { Pressable, StyleSheet, Text } from 'react-native';

import type { Pickup } from '@/data/model';
import { colors, fonts } from '@/theme';

// react-native-maps has no web version, so the browser build shows a plain box instead.
export function PickupMapPreview({ onPress }: { pickup: Pickup; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={styles.box}>
      <Text style={styles.text}>The map is available in the phone app.</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    height: 150,
    borderRadius: 16,
    backgroundColor: colors.mapGround,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { fontFamily: fonts.medium, fontSize: 15, color: colors.muted },
});
