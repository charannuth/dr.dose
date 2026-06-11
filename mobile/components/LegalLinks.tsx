import { Linking, Pressable, Text, View } from 'react-native';
import { privacyPolicyUrl, termsUrl } from '../lib/legalUrls';

type LegalLinksProps = {
  colors: { accent: string; textMuted: string };
  styles: {
    legalRow: object;
    legalLink: object;
    legalMuted: object;
  };
};

export function LegalLinks({ colors, styles }: LegalLinksProps) {
  const privacy = privacyPolicyUrl();
  const terms = termsUrl();

  if (!privacy && !terms) {
    return (
      <Text style={styles.legalMuted}>
        Set EXPO_PUBLIC_WEB_APP_URL in your environment for Privacy and Terms links.
      </Text>
    );
  }

  return (
    <View style={styles.legalRow}>
      {privacy ? (
        <Pressable onPress={() => void Linking.openURL(privacy)}>
          <Text style={[styles.legalLink, { color: colors.accent }]}>Privacy policy</Text>
        </Pressable>
      ) : null}
      {privacy && terms ? <Text style={styles.legalMuted}> · </Text> : null}
      {terms ? (
        <Pressable onPress={() => void Linking.openURL(terms)}>
          <Text style={[styles.legalLink, { color: colors.accent }]}>Terms of use</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
