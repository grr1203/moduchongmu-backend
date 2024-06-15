import { APIGatewayProxyEventV2WithLambdaAuthorizer } from 'aws-lambda';
import mysqlUtil from '../../lib/mysqlUtil';
import { FromSchema } from 'json-schema-to-ts';

const parameter = {
  type: 'object',
  properties: { travelUid: { type: 'string' } },
  required: ['travelUid'],
} as const;

export const handler = async (event: APIGatewayProxyEventV2WithLambdaAuthorizer<{ [key: string]: any }>) => {
  console.log('[event]', event);
  const { travelUid } = JSON.parse(event.body) as FromSchema<typeof parameter>;
  const userIdx = event.requestContext.authorizer.lambda.idx;

  const travel = await mysqlUtil.getOne('tb_travel', ['idx'], { uid: travelUid });
  await mysqlUtil.update('tb_travel_member', { active: true }, { travelIdx: travel.idx, userIdx });

  return { statusCode: 200, body: JSON.stringify({ travelUid }) };
};
