import { StyleSheet, Text, View, Link } from '@react-pdf/renderer';
import type { InvoiceData } from '../types';
import { colors } from '../fonts';

const styles = StyleSheet.create({
  wrap: {
    marginTop: 6,
    paddingTop: 12,
    borderTopWidth: 0.75,
    borderTopColor: colors.rule,
  },
  thanks: {
    fontFamily: 'Cormorant Garamond',
    fontSize: 12,
    fontWeight: 500,
    color: colors.forest,
    marginBottom: 2,
    lineHeight: 1.35,
  },
  thanksLast: {
    fontFamily: 'Cormorant Garamond',
    fontSize: 12,
    fontWeight: 500,
    color: colors.forest,
    marginBottom: 10,
    lineHeight: 1.35,
  },
  providerName: {
    fontFamily: 'Manrope',
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.forest,
    marginBottom: 2,
  },
  providerTitle: {
    fontFamily: 'Manrope',
    fontSize: 7.5,
    color: colors.gold,
    marginBottom: 5,
  },
  providerLine: {
    fontFamily: 'Manrope',
    fontSize: 7.5,
    color: colors.muted,
    lineHeight: 1.45,
  },
  providerLink: {
    fontFamily: 'Manrope',
    fontSize: 7.5,
    color: colors.muted,
    textDecoration: 'none',
    lineHeight: 1.45,
  },
});

type Props = {
  data: InvoiceData;
};

export function InvoiceFooter({ data }: Props) {
  const { footerNotes, footerProvider } = data;
  const websiteDisplay = footerProvider.website.replace(/^https?:\/\//, '');

  return (
    <View style={styles.wrap} wrap={false}>
      {footerNotes.map((note, index) => (
        <Text
          key={note}
          style={index === footerNotes.length - 1 ? styles.thanksLast : styles.thanks}
        >
          {note}
        </Text>
      ))}
      <Text style={styles.providerName}>{footerProvider.name}</Text>
      <Text style={styles.providerTitle}>{footerProvider.title}</Text>
      <Link src={`mailto:${footerProvider.email}`} style={styles.providerLink}>
        {footerProvider.email}
      </Link>
      <Text style={styles.providerLine}>{footerProvider.phone}</Text>
      <Link src={footerProvider.website} style={styles.providerLink}>
        {websiteDisplay}
      </Link>
    </View>
  );
}
