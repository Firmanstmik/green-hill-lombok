import { StyleSheet, Text, View } from '@react-pdf/renderer';
import type { InvoiceData } from '../types';
import { formatIdr } from '../formatCurrency';
import { colors } from '../fonts';

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 14,
    alignItems: 'flex-end',
  },
  card: {
    width: '58%',
    paddingTop: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontFamily: 'Manrope',
    fontSize: 7.5,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  value: {
    fontFamily: 'Manrope',
    fontSize: 9,
    fontWeight: 500,
    color: colors.forest,
  },
  dueBlock: {
    marginTop: 8,
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 12,
    borderTopWidth: 1.25,
    borderTopColor: colors.gold,
    backgroundColor: colors.softIvory,
  },
  dueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  dueLabel: {
    fontFamily: 'Manrope',
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.gold,
    paddingBottom: 3,
  },
  dueValue: {
    fontFamily: 'Cormorant Garamond',
    fontSize: 22,
    fontWeight: 600,
    color: colors.forest,
    textAlign: 'right',
  },
});

type Props = {
  data: InvoiceData;
};

export function InvoiceTotals({ data }: Props) {
  const { labels } = data;

  return (
    <View style={styles.wrap} wrap={false}>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>{labels.projectTotal}</Text>
          <Text style={styles.value}>{formatIdr(data.projectTotal)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>
            {labels.initialDeposit} — {data.depositPercentage}%
          </Text>
          <Text style={styles.value}>{formatIdr(data.depositAmount)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>{labels.balanceAfterDeposit}</Text>
          <Text style={styles.value}>{formatIdr(data.remainingBalance)}</Text>
        </View>

        <View style={styles.dueBlock}>
          <View style={styles.dueRow}>
            <Text style={styles.dueLabel}>{labels.amountDue}</Text>
            <Text style={styles.dueValue}>{formatIdr(data.amountDue)}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
