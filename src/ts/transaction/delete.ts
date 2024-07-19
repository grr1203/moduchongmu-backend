import { APIGatewayProxyEventV2WithLambdaAuthorizer } from 'aws-lambda';
import mysqlUtil from '../lib/mysqlUtil';
import { checkTravelMember } from '../lib/travel';
import { FromSchema } from 'json-schema-to-ts';

const parameter = {
  type: 'object',
  properties: {
    uid: { type: 'string' }, // transaction uid
  },
  required: ['uid'],
} as const;

export const handler = async (event: APIGatewayProxyEventV2WithLambdaAuthorizer<{ [key: string]: any }>) => {
  console.log('[event]', event);
  const { uid } = event.queryStringParameters as FromSchema<typeof parameter>;
  const userIdx = event.requestContext.authorizer.lambda.idx;

  const transaction = await mysqlUtil.getOne('tb_transaction', [], { uid });
  const travel = await mysqlUtil.getOne('tb_travel', [], { idx: transaction.travelIdx });
  const { isMember } = await checkTravelMember(travel.uid, userIdx);
  if (!isMember) return { statusCode: 403, body: JSON.stringify({ code: 'NOT_MEMBER' }) };

  await mysqlUtil.deleteMany('tb_transaction', { uid });

  return { statusCode: 200, body: JSON.stringify({ uid }) };
};
