import { StyleSheet } from '@react-pdf/renderer';
import { colors } from '../fonts';

export const invoiceStyles = StyleSheet.create({
  page: {
    backgroundColor: colors.ivory,
    color: colors.forest,
    fontFamily: 'Manrope',
    fontSize: 8.5,
    paddingTop: 32,
    paddingBottom: 28,
    paddingHorizontal: 40,
  },
  sectionTitle: {
    fontFamily: 'Manrope',
    fontSize: 7.5,
    fontWeight: 600,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.gold,
    marginBottom: 6,
  },
});
