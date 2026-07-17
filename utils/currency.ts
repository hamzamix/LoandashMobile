export interface Currency {
  code: string;
  name: string;
  symbol: string;
}

export const SUPPORTED_CURRENCIES: Currency[] = [
  // Major currencies
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },

  // Middle East & North Africa
  { code: 'MAD', name: 'Moroccan Dirham', symbol: 'DH' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼' },
  { code: 'QAR', name: 'Qatari Riyal', symbol: 'QR' },
  { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'KD' },
  { code: 'BHD', name: 'Bahraini Dinar', symbol: 'BD' },
  { code: 'OMR', name: 'Omani Rial', symbol: 'OMR' },
  { code: 'JOD', name: 'Jordanian Dinar', symbol: 'JD' },
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'E£' },
  { code: 'ILS', name: 'Israeli Shekel', symbol: '₪' },
  { code: 'LBP', name: 'Lebanese Pound', symbol: 'L£' },
  { code: 'IQD', name: 'Iraqi Dinar', symbol: 'IQD' },

  // Europe
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
  { code: 'UAH', name: 'Ukrainian Hryvnia', symbol: '₴' },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr' },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč' },
  { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft' },
  { code: 'RON', name: 'Romanian Leu', symbol: 'lei' },
  { code: 'BGN', name: 'Bulgarian Lev', symbol: 'лв' },
  { code: 'HRK', name: 'Croatian Kuna', symbol: 'kn' },
  { code: 'ISK', name: 'Icelandic Krona', symbol: 'kr' },
  { code: 'RSD', name: 'Serbian Dinar', symbol: 'din' },
  { code: 'BAM', name: 'Bosnia-Herzegovina Mark', symbol: 'KM' },
  { code: 'ALL', name: 'Albanian Lek', symbol: 'L' },
  { code: 'MKD', name: 'Macedonian Denar', symbol: 'ден' },
  { code: 'MDL', name: 'Moldovan Leu', symbol: 'MDL' },
  { code: 'GEL', name: 'Georgian Lari', symbol: '₾' },
  { code: 'AMD', name: 'Armenian Dram', symbol: '֏' },
  { code: 'AZN', name: 'Azerbaijani Manat', symbol: '₼' },

  // Asia
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: 'Rs' },
  { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳' },
  { code: 'LKR', name: 'Sri Lankan Rupee', symbol: 'Rs' },
  { code: 'NPR', name: 'Nepalese Rupee', symbol: 'Rs' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
  { code: 'TWD', name: 'Taiwan Dollar', symbol: 'NT$' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿' },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
  { code: 'MMK', name: 'Myanmar Kyat', symbol: 'K' },
  { code: 'KHR', name: 'Cambodian Riel', symbol: '៛' },
  { code: 'LAK', name: 'Lao Kip', symbol: '₭' },
  { code: 'MNT', name: 'Mongolian Tugrik', symbol: '₮' },
  { code: 'KZT', name: 'Kazakhstani Tenge', symbol: '₸' },
  { code: 'UZS', name: 'Uzbekistani Som', symbol: 'soʻm' },
  { code: 'AFN', name: 'Afghan Afghani', symbol: '؋' },
  { code: 'IRR', name: 'Iranian Rial', symbol: '﷼' },

  // Americas
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$' },
  { code: 'ARS', name: 'Argentine Peso', symbol: 'AR$' },
  { code: 'CLP', name: 'Chilean Peso', symbol: 'CL$' },
  { code: 'COP', name: 'Colombian Peso', symbol: 'CO$' },
  { code: 'PEN', name: 'Peruvian Sol', symbol: 'S/.' },
  { code: 'UYU', name: 'Uruguayan Peso', symbol: '$U' },
  { code: 'PYG', name: 'Paraguayan Guarani', symbol: '₲' },
  { code: 'BOB', name: 'Bolivian Boliviano', symbol: 'Bs' },
  { code: 'VES', name: 'Venezuelan Bolivar', symbol: 'Bs.S' },
  { code: 'GTQ', name: 'Guatemalan Quetzal', symbol: 'Q' },
  { code: 'HNL', name: 'Honduran Lempira', symbol: 'L' },
  { code: 'NIO', name: 'Nicaraguan Cordoba', symbol: 'C$' },
  { code: 'CRC', name: 'Costa Rican Colón', symbol: '₡' },
  { code: 'PAB', name: 'Panamanian Balboa', symbol: 'B/.' },
  { code: 'DOP', name: 'Dominican Peso', symbol: 'RD$' },
  { code: 'CUP', name: 'Cuban Peso', symbol: '₱' },
  { code: 'JMD', name: 'Jamaican Dollar', symbol: 'J$' },
  { code: 'TTD', name: 'Trinidad Dollar', symbol: 'TT$' },
  { code: 'HTG', name: 'Haitian Gourde', symbol: 'G' },
  { code: 'BBD', name: 'Barbadian Dollar', symbol: 'Bds$' },
  { code: 'BSD', name: 'Bahamian Dollar', symbol: 'B$' },
  { code: 'BZD', name: 'Belize Dollar', symbol: 'BZ$' },
  { code: 'GYD', name: 'Guyanese Dollar', symbol: 'GY$' },
  { code: 'SRD', name: 'Surinamese Dollar', symbol: 'SRD' },
  { code: 'FJD', name: 'Fijian Dollar', symbol: 'FJ$' },

  // Africa
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: 'GH₵' },
  { code: 'TZS', name: 'Tanzanian Shilling', symbol: 'TSh' },
  { code: 'UGX', name: 'Ugandan Shilling', symbol: 'USh' },
  { code: 'ETB', name: 'Ethiopian Birr', symbol: 'Br' },
  { code: 'XOF', name: 'CFA Franc (West)', symbol: 'CFA' },
  { code: 'XAF', name: 'CFA Franc (Central)', symbol: 'FCFA' },
  { code: 'MAD', name: 'Moroccan Dirham', symbol: 'DH' },
  { code: 'DZD', name: 'Algerian Dinar', symbol: 'DA' },
  { code: 'TND', name: 'Tunisian Dinar', symbol: 'DT' },
  { code: 'LYD', name: 'Libyan Dinar', symbol: 'LD' },
  { code: 'SDG', name: 'Sudanese Pound', symbol: 'SDG' },
  { code: 'MUR', name: 'Mauritian Rupee', symbol: 'Rs' },
  { code: 'MGA', name: 'Malagasy Ariary', symbol: 'Ar' },
  { code: 'CDF', name: 'Congolese Franc', symbol: 'FC' },
  { code: 'RWF', name: 'Rwandan Franc', symbol: 'RF' },
  { code: 'BOB', name: 'Bolivian Boliviano', symbol: 'Bs' },
  { code: 'MWK', name: 'Malawian Kwacha', symbol: 'MK' },
  { code: 'ZMW', name: 'Zambian Kwacha', symbol: 'ZK' },
  { code: 'BWP', name: 'Botswana Pula', symbol: 'P' },
  { code: 'SZL', name: 'Swazi Lilangeni', symbol: 'E' },
  { code: 'LSL', name: 'Lesotho Loti', symbol: 'L' },
  { code: 'NAD', name: 'Namibian Dollar', symbol: 'N$' },

  // Oceania
  { code: 'PGK', name: 'Papua New Guinea Kina', symbol: 'K' },
  { code: 'WST', name: 'Samoan Tala', symbol: 'WS$' },
  { code: 'TOP', name: 'Tongan Paʻanga', symbol: 'T$' },
  { code: 'VUV', name: 'Vanuatu Vatu', symbol: 'VT' },

  // Crypto-style (for display purposes)
  { code: 'BTC', name: 'Bitcoin', symbol: '₿' },
  { code: 'ETH', name: 'Ethereum', symbol: 'Ξ' },
];

export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    // Fallback for unsupported currencies
    const found = SUPPORTED_CURRENCIES.find(c => c.code === currency);
    return `${found?.symbol || currency} ${amount.toFixed(2)}`;
  }
};

export const getCurrencySymbol = (currency: string): string => {
  const found = SUPPORTED_CURRENCIES.find(c => c.code === currency);
  return found?.symbol || currency;
};

export const getCurrencyName = (currency: string): string => {
  const found = SUPPORTED_CURRENCIES.find(c => c.code === currency);
  return found?.name || currency;
};
