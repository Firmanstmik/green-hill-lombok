import { StyleSheet, Text, View } from '@react-pdf/renderer';
import type { InvoiceData } from '../types';
import { colors } from '../fonts';
import { invoiceStyles } from './invoiceStyles';

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: '50%',
    marginBottom: 7,
    paddingRight: 12,
  },
  label: {
    fontFamily: 'Manrope',
    fontSize: 7,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.muted,
    marginBottom: 2,
  },
  value: {
    fontFamily: 'Manrope',
    fontSize: 9,
    fontWeight: 500,
    color: colors.forest,
  },
});

type Props = {
  data: InvoiceData;
};

export function PaymentDetails({ data }: Props) {
  const { labels, paymentDetails } = data;

  const rows = [
    { label: labels.accountName, value: paymentDetails.accountName },
    { label: labels.bank, value: paymentDetails.bank },
    { label: labels.accountNumber, value: paymentDetails.accountNumber },
    ...(paymentDetails.swiftBic
      ? [{ label: 'SWIFT / BIC', value: paymentDetails.swiftBic }]
      : []),
    { label: labels.paymentReference, value: paymentDetails.paymentReference },
  ];

  return (
    <View style={styles.wrap} wrap={false}>
      <Text style={invoiceStyles.sectionTitle}>{labels.paymentDetails}</Text>
      <View style={styles.grid}>
        {rows.map((row) => (
          <View key={row.label} style={styles.cell}>
            <Text style={styles.label}>{row.label}</Text>
            <Text style={styles.value}>{row.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
