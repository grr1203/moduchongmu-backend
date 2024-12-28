import { APIGatewayProxyEventV2WithLambdaAuthorizer } from 'aws-lambda';
import { FromSchema } from 'json-schema-to-ts';
import { formatTravel } from '../../lib/travel';
import mysqlUtil from 'src/ts/lib/mysqlUtil';

const parameter = {
  type: 'object',
  properties: {
    travelUid: { type: 'string' },
  },
  required: ['travelUid'],
} as const;

export const handler = async (event: APIGatewayProxyEventV2WithLambdaAuthorizer<{ [key: string]: any }>) => {
  console.log('[event]', event);
  const { travelUid } = event.queryStringParameters as FromSchema<typeof parameter>;

  const travelData = await mysqlUtil.getOne('tb_travel', [], { uid: travelUid });
  const travel = await formatTravel(travelData as any);

  return { statusCode: 200, body: JSON.stringify({ travel }) };
};
