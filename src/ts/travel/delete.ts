import { APIGatewayProxyEventV2WithLambdaAuthorizer } from 'aws-lambda';
import mysqlUtil from '../lib/mysqlUtil';
import { checkTravelHost } from '../lib/travel';
import { FromSchema } from 'json-schema-to-ts';

const parameter = {
  type: 'object',
  properties: {
    uid: { type: 'string' },
  },
  required: ['uid'],
} as const;

export const handler = async (event: APIGatewayProxyEventV2WithLambdaAuthorizer<{ [key: string]: any }>) => {
  console.log('[event]', event);
  const { uid } = event.queryStringParameters as FromSchema<typeof parameter>;
  const userIdx = event.requestContext.authorizer.lambda.idx;

  // 여행 방장인지 체크
  const { isHost } = await checkTravelHost(uid, userIdx);
  if (!isHost) return { statusCode: 403, body: JSON.stringify({ code: 'NOT_HOST' }) };

  await mysqlUtil.deleteMany('tb_travel', { uid });

  return { statusCode: 200, body: JSON.stringify({ uid }) };
};
