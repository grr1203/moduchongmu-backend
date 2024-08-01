import { APIGatewayProxyEventV2WithLambdaAuthorizer } from 'aws-lambda';
import mysqlUtil from '../../lib/mysqlUtil';
import { checkTravelHost, checkTravelMember } from '../../lib/travel';
import { FromSchema } from 'json-schema-to-ts';

const parameter = {
  type: 'object',
  properties: {
    travelUid: { type: 'string' },
    memberName: { type: 'string' },
  },
  required: ['travelUid', 'memberName'],
} as const;

export const handler = async (event: APIGatewayProxyEventV2WithLambdaAuthorizer<{ [key: string]: any }>) => {
  console.log('[event]', event);
  const { travelUid, memberName } = event.queryStringParameters as FromSchema<typeof parameter>;
  const userIdx = event.requestContext.authorizer.lambda.idx;

  const member = await mysqlUtil.getOne('tb_user', [], { userName: memberName });

  // 여행 방장인지 체크
  const { isHost } = await checkTravelHost(travelUid, userIdx);
  if (!isHost) {
    // 여행 방장이 아닌 경우 방 멤버인지 체크
    const { isMember } = await checkTravelMember(travelUid, userIdx);
    if (!isMember) return { statusCode: 403, body: JSON.stringify({ code: 'NOT_MEMBER' }) };
    // 방 멤버인 경우 자신만 삭제(탈퇴) 가능
    if (member.idx !== userIdx) return { statusCode: 403, body: JSON.stringify({ code: 'NOT_HOST' }) };
  }

  await mysqlUtil.deleteMany('tb_travel_member', { travelUid, userIdx: member.idx });

  return { statusCode: 200, body: JSON.stringify({}) };
};
