import type { Organisation } from '../core/types';

/**
 * Default curated list of commonly impersonated organisations and their official registrable domains.
 * Remote Config key "organisations_json" overrides this list without a release.
 * Phone numbers are deliberately not listed: the verdict card tells people to find the number
 * on the official website instead, so the app can never show an out-of-date number.
 */
export const DEFAULT_ORGANISATIONS: Organisation[] = [
  // United States
  { id: 'usps', name: 'USPS', country: 'US', aliases: ['us postal service', 'united states postal service', 'postal service', 'usps'], domains: ['usps.com'] },
  { id: 'ups', name: 'UPS', country: 'US', aliases: ['ups', 'united parcel service'], domains: ['ups.com'] },
  { id: 'fedex', name: 'FedEx', country: 'US', aliases: ['fedex', 'fed ex', 'federal express'], domains: ['fedex.com'] },
  { id: 'dhl', name: 'DHL', country: 'US', aliases: ['dhl', 'dhl express'], domains: ['dhl.com'] },
  { id: 'amazon', name: 'Amazon', country: 'US', aliases: ['amazon', 'amazon prime', 'amzn'], domains: ['amazon.com', 'amazon.co.uk', 'amzn.to'] },
  { id: 'irs', name: 'IRS', country: 'US', aliases: ['irs', 'internal revenue service'], domains: ['irs.gov'] },
  { id: 'ssa', name: 'Social Security Administration', country: 'US', aliases: ['social security', 'ssa', 'social security administration'], domains: ['ssa.gov'] },
  { id: 'medicare', name: 'Medicare', country: 'US', aliases: ['medicare'], domains: ['medicare.gov'] },
  { id: 'bofa', name: 'Bank of America', country: 'US', aliases: ['bank of america', 'bofa'], domains: ['bankofamerica.com'] },
  { id: 'chase', name: 'Chase', country: 'US', aliases: ['chase', 'jpmorgan chase', 'chase bank'], domains: ['chase.com'] },
  { id: 'wellsfargo', name: 'Wells Fargo', country: 'US', aliases: ['wells fargo'], domains: ['wellsfargo.com'] },
  { id: 'paypal', name: 'PayPal', country: 'US', aliases: ['paypal'], domains: ['paypal.com'] },
  { id: 'apple', name: 'Apple', country: 'US', aliases: ['apple', 'apple support', 'icloud', 'apple id'], domains: ['apple.com', 'icloud.com'] },
  { id: 'microsoft', name: 'Microsoft', country: 'US', aliases: ['microsoft', 'windows support', 'microsoft support', 'outlook'], domains: ['microsoft.com', 'live.com', 'outlook.com'] },
  { id: 'netflix', name: 'Netflix', country: 'US', aliases: ['netflix'], domains: ['netflix.com'] },
  { id: 'walmart', name: 'Walmart', country: 'US', aliases: ['walmart'], domains: ['walmart.com'] },
  // United Kingdom
  { id: 'royalmail', name: 'Royal Mail', country: 'UK', aliases: ['royal mail', 'royalmail'], domains: ['royalmail.com'] },
  { id: 'evri', name: 'Evri', country: 'UK', aliases: ['evri', 'hermes'], domains: ['evri.com'] },
  { id: 'hmrc', name: 'HMRC', country: 'UK', aliases: ['hmrc', 'hm revenue', 'hm revenue and customs', 'tax office'], domains: ['gov.uk'] },
  { id: 'dvla', name: 'DVLA', country: 'UK', aliases: ['dvla', 'driver and vehicle licensing agency'], domains: ['gov.uk'] },
  { id: 'nhs', name: 'NHS', country: 'UK', aliases: ['nhs', 'national health service'], domains: ['nhs.uk'] },
  { id: 'barclays', name: 'Barclays', country: 'UK', aliases: ['barclays'], domains: ['barclays.co.uk', 'barclays.com'] },
  { id: 'hsbc', name: 'HSBC', country: 'UK', aliases: ['hsbc', 'hsbc uk'], domains: ['hsbc.co.uk', 'hsbc.com'] },
  { id: 'lloyds', name: 'Lloyds Bank', country: 'UK', aliases: ['lloyds', 'lloyds bank'], domains: ['lloydsbank.com'] },
  { id: 'natwest', name: 'NatWest', country: 'UK', aliases: ['natwest'], domains: ['natwest.com'] },
  { id: 'santander', name: 'Santander UK', country: 'UK', aliases: ['santander'], domains: ['santander.co.uk'] },
  { id: 'nationwide', name: 'Nationwide', country: 'UK', aliases: ['nationwide', 'nationwide building society'], domains: ['nationwide.co.uk'] },
  { id: 'tvlicensing', name: 'TV Licensing', country: 'UK', aliases: ['tv licensing', 'tv licence', 'tv license'], domains: ['tvlicensing.co.uk'] },
  { id: 'bt', name: 'BT', country: 'UK', aliases: ['bt', 'british telecom', 'bt broadband'], domains: ['bt.com'] },
];

/** Reporting steps per country. Remote Config key "reporting_json" overrides this. */
export const DEFAULT_REPORTING: Record<string, string[]> = {
  US: [
    'Do not reply, click links or call numbers in the message.',
    'Report it to the FTC at reportfraud.ftc.gov.',
    'Forward scam texts to 7726 (SPAM), then delete them.',
    'If you paid or shared details, call your bank using the number on the back of your card.',
  ],
  UK: [
    'Do not reply, click links or call numbers in the message.',
    'Forward scam texts to 7726, then delete them.',
    'Forward scam emails to report@phishing.gov.uk.',
    'If you paid or shared details, call your bank on 159 or the number on the back of your card.',
  ],
};
