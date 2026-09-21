import { StyleSheet, Text, View, Link } from '@react-pdf/renderer';
import type { InvoiceContactLine, InvoiceData, InvoiceParty } from '../types';
import { colors } from '../fonts';
import { invoiceStyles } from './invoiceStyles';

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  column: {
    width: '46%',
  },
  name: {
    fontFamily: 'Cormorant Garamond',
    fontSize: 13,
    fontWeight: 500,
    color: colors.forest,
    marginBottom: 3,
  },
  title: {
    fontFamily: 'Manrope',
    fontSize: 8.5,
    fontWeight: 600,
    color: colors.forest,
    marginBottom: 4,
  },
  line: {
    fontFamily: 'Manrope',
    fontSize: 8,
    lineHeight: 1.45,
    color: colors.muted,
    marginBottom: 1,
  },
  contactRow: {
    flexDirection: 'row',
    marginTop: 2,
  },
  contactLabel: {
    fontFamily: 'Manrope',
    fontSize: 7.5,
    color: colors.muted,
    width: 52,
  },
  contactValue: {
    fontFamily: 'Manrope',
    fontSize: 8,
    color: colors.forest,
    flex: 1,
  },
  contactLink: {
    fontFamily: 'Manrope',
    fontSize: 8,
    color: colors.forest,
    textDecoration: 'none',
    flex: 1,
  },
});

type Props = {
  data: InvoiceData;
};

function ContactLine({ contact }: { contact: InvoiceContactLine }) {
  const isUrl = contact.value.startsWith('http');
  const isEmail = contact.label.toLowerCase() === 'email';

  return (
    <View style={styles.contactRow}>
      <Text style={styles.contactLabel}>{contact.label}</Text>
      {isUrl ? (
        <Link src={contact.value} style={styles.contactLink}>
          {contact.value.replace(/^https?:\/\//, '')}
        </Link>
      ) : isEmail ? (
        <Link src={`mailto:${contact.value}`} style={styles.contactLink}>
          {contact.value}
        </Link>
      ) : (
        <Text style={styles.contactValue}>{contact.value}</Text>
      )}
    </View>
  );
}

function PartyBlock({ label, party }: { label: string; party: InvoiceParty }) {
  return (
    <View style={styles.column}>
      <Text style={invoiceStyles.sectionTitle}>{label}</Text>
      <Text style={styles.name}>{party.name}</Text>
      {party.title ? <Text style={styles.title}>{party.title}</Text> : null}
      {party.addressLines.map((line) => (
        <Text key={line} style={styles.line}>
          {line}
        </Text>
      ))}
      {party.contacts.map((contact) => (
        <ContactLine key={`${contact.label}-${contact.value}`} contact={contact} />
      ))}
    </View>
  );
}

export function InvoiceParties({ data }: Props) {
  return (
    <View style={styles.row}>
      <PartyBlock label={data.labels.from} party={data.sender} />
      <PartyBlock label={data.labels.to} party={data.client} />
    </View>
  );
}
