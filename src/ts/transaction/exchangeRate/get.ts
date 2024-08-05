import { APIGatewayProxyEventV2WithLambdaAuthorizer } from 'aws-lambda';
import { FromSchema } from 'json-schema-to-ts';
import mysqlUtil from '../../lib/mysqlUtil';

const parameter = {
  type: 'object',
  properties: {
    currency: { type: 'string' },
  },
  required: [],
} as const;

export const handler = async (event: APIGatewayProxyEventV2WithLambdaAuthorizer<{ [key: string]: any }>) => {
  console.log('[event]', event);
  const { currency } = (event.queryStringParameters || {}) as FromSchema<typeof parameter>;

  let exchangeRateList = [];
  // 특정 나라 조회
  if (currency) {
    const foundCurrency = await mysqlUtil.getOne('tb_transaction_exchange_rate', [], { currency });
    exchangeRateList.push(foundCurrency);
  }
  // 전체 조회
  else {
    exchangeRateList = await mysqlUtil.getMany('tb_transaction_exchange_rate', [], {});
  }
  console.log('exchangeRateList', exchangeRateList);

  return { statusCode: 200, body: JSON.stringify({ exchangeRateList }) };
};
