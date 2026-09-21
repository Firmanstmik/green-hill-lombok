import { Image, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { InvoiceData } from '../types';
import { colors } from '../fonts';
import logoAsset from '../logo-green-hill-lombok-transparent.png';

function resolveLogoSrc() {
  const fromEnv =
    typeof process !== 'undefined'
      ? (process as { env?: Record<string, string | undefined> }).env?.GH_INVOICE_LOGO_DATA_URI
      : undefined;
  return fromEnv || logoAsset;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  brandBlock: {
    width: '56%',
  },
  logo: {
    width: 108,
    height: 72,
    objectFit: 'contain',
    marginBottom: 4,
  },
  tagline: {
    fontFamily: 'Manrope',
    fontSize: 7,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.gold,
  },
  metaBlock: {
    width: '42%',
    alignItems: 'flex-end',
  },
  invoiceTitle: {
    fontFamily: 'Cormorant Garamond',
    fontSize: 24,
    fontWeight: 500,
    letterSpacing: 2.5,
    color: colors.forest,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    marginBottom: 3,
  },
  metaLabel: {
    fontFamily: 'Manrope',
    fontSize: 6.5,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.muted,
    width: 86,
    textAlign: 'right',
    marginRight: 8,
  },
  metaValue: {
    fontFamily: 'Manrope',
    fontSize: 8.5,
    color: colors.forest,
    width: 120,
    textAlign: 'right',
  },
  accentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  accentMark: {
    width: 24,
    height: 1,
    backgroundColor: colors.gold,
    marginRight: 8,
  },
  accentLine: {
    flexGrow: 1,
    height: 0.75,
    backgroundColor: colors.rule,
  },
});

type Props = {
  data: InvoiceData;
};

export function InvoiceHeader({ data }: Props) {
  const { labels } = data;

  return (
    <View>
      <View style={styles.row}>
        <View style={styles.brandBlock}>
          <Image src={resolveLogoSrc()} style={styles.logo} />
          <Text style={styles.tagline}>{data.brandTagline}</Text>
        </View>

        <View style={styles.metaBlock}>
          <Text style={styles.invoiceTitle}>{data.invoiceTitle}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>{labels.invoiceNo}</Text>
            <Text style={styles.metaValue}>{data.invoiceNumber}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>{labels.issueDate}</Text>
            <Text style={styles.metaValue}>{data.issueDate}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>{labels.dueDate}</Text>
            <Text style={styles.metaValue}>{data.dueDate}</Text>
          </View>
        </View>
      </View>

      <View style={styles.accentRow}>
        <View style={styles.accentMark} />
        <View style={styles.accentLine} />
      </View>
    </View>
  );
}
