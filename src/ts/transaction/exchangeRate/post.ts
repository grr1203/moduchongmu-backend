import { APIGatewayProxyEventV2WithLambdaAuthorizer } from 'aws-lambda';
import mysqlUtil from '../../lib/mysqlUtil';
import axios from 'axios';

export const handler = async (event: APIGatewayProxyEventV2WithLambdaAuthorizer<{ [key: string]: any }>) => {
  console.log('[event]', event);

  const apiEndpoint = 'https://api.apilayer.com/exchangerates_data/latest';
  const res = await axios.get(apiEndpoint, {
    params: { base: 'KRW' },
    headers: { apikey: process.env.API_LAYER_KEY },
  });
  console.log('[exchangerates_data res]', res.data);

  const exchangeRateList = res.data?.rates;
  const currencyList = (await mysqlUtil.getMany('tb_transaction_exchange_rate', [], {})).map((e) => e.currency);
  await Promise.all(
    currencyList.map(async (currency) => {
      await mysqlUtil.update('tb_transaction_exchange_rate', { rate: exchangeRateList[currency] }, { currency });
    })
  );

  return { statusCode: 200, body: JSON.stringify({}) };
};
