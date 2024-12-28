import { APIGatewayProxyEventV2WithLambdaAuthorizer } from 'aws-lambda';
import { FromSchema } from 'json-schema-to-ts';
import mysqlUtil from '../../lib/mysqlUtil';

const parameter = {
  type: 'object',
  properties: {
    country: { type: 'string' },
  },
  required: [],
} as const;

export const handler = async (event: APIGatewayProxyEventV2WithLambdaAuthorizer<{ [key: string]: any }>) => {
  console.log('[event]', event);
  const { country } = (event.queryStringParameters || {}) as FromSchema<typeof parameter>;

  const currencyList = [];
  // 특정 나라 조회
  if (country) {
    const foundCurrency = await mysqlUtil.getOne('tb_transaction_currency', [], { country });
    foundCurrency.country = [foundCurrency.country];
    delete foundCurrency.idx;

    currencyList.push(foundCurrency);
  }
  // 전체 조회
  else {
    const foundCurrencyList = await mysqlUtil.getMany('tb_transaction_currency', [], {});
    foundCurrencyList.forEach((item) => {
      if (item.currency === '알수없음') return;
      // currency unique하게 조회
      let found = currencyList.find((entry) => entry.currency === item.currency);
      if (!found) {
        found = { country: [], currency: item.currency, symbol: item.symbol, name: item.nameKo };
        currencyList.push(found);
      }

      found.country.push(item.country);
    });
  }
  console.log('currencyList', currencyList);

  return { statusCode: 200, body: JSON.stringify({ currencyList }) };
};
