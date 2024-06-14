import { APIGatewayProxyEventV2WithLambdaAuthorizer } from 'aws-lambda';
import { FromSchema } from 'json-schema-to-ts';
import { checkTravelMember, formatTravel } from '../lib/travel';

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

  // 자기가 포함된 여행방인지 체크 & 조회
  const { isMember, travel: travelData } = await checkTravelMember(uid, userIdx);
  if (!isMember) return { statusCode: 403, body: JSON.stringify({ code: 'NOT_MEMBER' }) };

  const travel = await formatTravel(travelData as any);

  return { statusCode: 200, body: JSON.stringify({ travel }) };
};
