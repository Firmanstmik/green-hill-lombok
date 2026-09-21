import { StyleSheet, Text, View } from '@react-pdf/renderer';
import type { InvoiceData } from '../types';
import { formatIdr } from '../formatCurrency';
import { colors } from '../fonts';
import { invoiceStyles } from './invoiceStyles';

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 12,
  },
  projectName: {
    fontFamily: 'Cormorant Garamond',
    fontSize: 11,
    fontWeight: 500,
    color: colors.forest,
    marginBottom: 8,
  },
  tableHead: {
    flexDirection: 'row',
    borderBottomWidth: 0.75,
    borderBottomColor: colors.forest,
    paddingBottom: 5,
    marginBottom: 6,
  },
  tableRow: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.rule,
  },
  colDesc: { width: '48%' },
  colQty: { width: '12%', textAlign: 'right' },
  colRate: { width: '20%', textAlign: 'right' },
  colAmount: { width: '20%', textAlign: 'right' },
  headCell: {
    fontFamily: 'Manrope',
    fontSize: 7,
    fontWeight: 600,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  cell: {
    fontFamily: 'Manrope',
    fontSize: 8.5,
    color: colors.forest,
  },
  itemTitle: {
    fontFamily: 'Manrope',
    fontSize: 9,
    fontWeight: 600,
    color: colors.forest,
    marginBottom: 2,
  },
  itemDetail: {
    fontFamily: 'Manrope',
    fontSize: 7.5,
    color: colors.muted,
    lineHeight: 1.4,
  },
});

type Props = {
  data: InvoiceData;
};

export function InvoiceItems({ data }: Props) {
  const { labels } = data;

  return (
    <View style={styles.wrap}>
      <Text style={invoiceStyles.sectionTitle}>{labels.project}</Text>
      <Text style={styles.projectName}>{data.projectName}</Text>

      <View style={styles.tableHead}>
        <Text style={[styles.headCell, styles.colDesc]}>{labels.description}</Text>
        <Text style={[styles.headCell, styles.colQty]}>{labels.qty}</Text>
        <Text style={[styles.headCell, styles.colRate]}>{labels.rate}</Text>
        <Text style={[styles.headCell, styles.colAmount]}>{labels.amount}</Text>
      </View>

      {data.items.map((item) => (
        <View key={item.description} style={styles.tableRow} wrap={false}>
          <View style={styles.colDesc}>
            <Text style={styles.itemTitle}>{item.description}</Text>
            {item.detail ? <Text style={styles.itemDetail}>{item.detail}</Text> : null}
          </View>
          <Text style={[styles.cell, styles.colQty]}>{item.quantity}</Text>
          <Text style={[styles.cell, styles.colRate]}>{formatIdr(item.rate)}</Text>
          <Text style={[styles.cell, styles.colAmount]}>{formatIdr(item.amount)}</Text>
        </View>
      ))}
    </View>
  );
}
