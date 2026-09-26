/**
 * Investor qualification options (brief §9 standard enquiry, §21 Green Hill
 * Private). The `value` is what is stored in the CRM, in English, so Reece
 * always reads the same wording whatever language the visitor used. The
 * `key` is the translation key for what the visitor sees.
 */
export type Option = { value: string; key: string };

const opt = (group: string) => (value: string, id: string): Option => ({ value, key: `enquiry.options.${group}.${id}` });

const budget = opt('budget');
/** Brief §9: "under £50k; £50–100k; £100–250k; £250–500k; £500k–£1m; £1m+". */
export const BUDGET_BANDS: Option[] = [
  budget('Under £50k', 'under50k'),
  budget('£50–100k', '50to100k'),
  budget('£100–250k', '100to250k'),
  budget('£250–500k', '250to500k'),
  budget('£500k–£1m', '500kto1m'),
  budget('£1m+', 'over1m'),
];

const interest = opt('interests');
/** Brief §9 interests. */
export const INTERESTS: Option[] = [
  interest('Land', 'land'),
  interest('Villa', 'villa'),
  interest('Off-plan', 'offPlan'),
  interest('Rental investment', 'rentalInvestment'),
  interest('Land banking', 'landBanking'),
  interest('Development opportunity', 'development'),
  interest('Lifestyle / home', 'lifestyle'),
  interest('Not sure yet', 'notSure'),
];

const objective = opt('objective');
/** Brief §9 objectives. */
export const OBJECTIVES: Option[] = [
  objective('Capital growth', 'capitalGrowth'),
  objective('Rental income', 'rentalIncome'),
  objective('Development', 'development'),
  objective('Lifestyle', 'lifestyle'),
  objective('A combination', 'combination'),
];

const timeframe = opt('timeframe');
/** The brief asks for a timeframe without bands; these are neutral choices. */
export const TIMEFRAMES: Option[] = [
  timeframe('Within 3 months', 'within3m'),
  timeframe('3–6 months', '3to6m'),
  timeframe('6–12 months', '6to12m'),
  timeframe('More than 12 months', 'over12m'),
  timeframe('Just exploring', 'exploring'),
];

const capital = opt('capital');
/** Brief §21: "USD 100k–250k; 250k–500k; 500k–1m; 1m–5m; 5m–10m; 10m+". */
export const CAPITAL_BANDS: Option[] = [
  capital('USD 100k–250k', '100to250k'),
  capital('USD 250k–500k', '250to500k'),
  capital('USD 500k–1m', '500kto1m'),
  capital('USD 1m–5m', '1to5m'),
  capital('USD 5m–10m', '5to10m'),
  capital('USD 10m+', 'over10m'),
];

const investorType = opt('investorType');
/** Brief §21 investor types. */
export const INVESTOR_TYPES: Option[] = [
  investorType('Private investor', 'private'),
  investorType('Developer', 'developer'),
  investorType('Family office', 'familyOffice'),
  investorType('Investment group', 'group'),
  investorType('Hospitality operator', 'hospitality'),
  investorType('Other', 'other'),
];

const privateInterest = opt('privateInterests');
/** Brief §21 interests. */
export const PRIVATE_INTERESTS: Option[] = [
  privateInterest('Land banking', 'landBanking'),
  privateInterest('Development', 'development'),
  privateInterest('Hospitality', 'hospitality'),
  privateInterest('Residential development', 'residential'),
  privateInterest('JV opportunities', 'jv'),
  privateInterest('Other', 'other'),
];
