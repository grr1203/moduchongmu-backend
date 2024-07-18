import axios from 'axios';
import mysqlUtil from '../build/lib/mysqlUtil.js';

const res = await axios.get('https://restcountries.com/v3.1/all');
console.log('res', res.data);

const currencyList = res.data.map((country) => {
  const currency = country.currencies ? Object.keys(country.currencies)[0] : '알수없음';
  return {
    country: country.translations.kor.common,
    currency,
    symbol: currency !== '알수없음' ? country.currencies[currency]?.symbol : null,
  };
});
console.log('currencyList', currencyList);

// const groupedCurrencyList = [];
// currencyList.forEach((item) => {
//   let found = groupedCurrencyList.find((entry) => entry.currency === item.currency);
//   if (!found) {
//     found = { country: [], currency: item.currency, symbol: item.symbol };
//     groupedCurrencyList.push(found);
//   }
//   found.country.push(item.country);
// });
// console.log('groupedCurrencyList', groupedCurrencyList);

for (const currency of currencyList) {
  await mysqlUtil.create('tb_transaction_currency', currency);
}
