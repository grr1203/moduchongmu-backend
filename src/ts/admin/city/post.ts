import { APIGatewayProxyEventV2WithLambdaAuthorizer } from 'aws-lambda';
import mysqlUtil from '../../lib/mysqlUtil';
import { FromSchema } from 'json-schema-to-ts';

const parameter = {
  type: 'object',
  properties: {
    country: { type: 'string' },
    city: { type: 'string' },
  },
  required: ['country', 'city'],
} as const;

export const handler = async (event: APIGatewayProxyEventV2WithLambdaAuthorizer<{ [key: string]: any }>) => {
  console.log('[event]', event);
  const { country, city } = JSON.parse(event.body) as FromSchema<typeof parameter>;

  const isExist = await mysqlUtil.getOne('tb_travel_city', [], { country, city });
  if (isExist) return { statusCode: 400, body: JSON.stringify({ message: '이미 등록된 도시입니다.' }) };
  
  await mysqlUtil.create('tb_travel_city', { country, city });
  
  return { statusCode: 200, body: JSON.stringify({}) };
};
