import { StyleSheet, Text, View } from '@react-pdf/renderer';
import type { InvoiceData } from '../types';
import { colors } from '../fonts';
import { invoiceStyles } from './invoiceStyles';

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 10,
  },
  term: {
    fontFamily: 'Manrope',
    fontSize: 8,
    lineHeight: 1.5,
    color: colors.muted,
    marginBottom: 5,
  },
  finalTerm: {
    fontFamily: 'Manrope',
    fontSize: 8,
    lineHeight: 1.5,
    color: colors.forest,
    marginBottom: 0,
  },
});

type Props = {
  data: InvoiceData;
};

export function PaymentTerms({ data }: Props) {
  const terms = data.paymentTerms;
  const lastIndex = terms.length - 1;

  return (
    <View style={styles.wrap} wrap={false}>
      <Text style={invoiceStyles.sectionTitle}>{data.labels.paymentTerms}</Text>
      {terms.map((term, index) => (
        <Text key={term} style={index === lastIndex ? styles.finalTerm : styles.term}>
          {term}
        </Text>
      ))}
    </View>
  );
}
