import { APIGatewayProxyEventV2WithLambdaAuthorizer } from 'aws-lambda';
import mysqlUtil from '../../lib/mysqlUtil';
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
  const { travelUid, memberName } = JSON.parse(event.body) as FromSchema<typeof parameter>;

  const travel = await mysqlUtil.getOne('tb_travel', [], { uid: travelUid });
  const member = await mysqlUtil.getOne('tb_user', [], { userName: memberName });

  // 1. 가입한 친구
  if (member) {
    // 이미 초대한 경우 (수락 여부 상관없이)
    const isExist = await mysqlUtil.getOne('tb_travel_member', [], {
      travelIdx: travel.idx,
      memberName,
      userIdx: member.idx,
    });
    if (isExist) return { statusCode: 200, body: JSON.stringify({ code: 'Already_Invited' }) };

    // 초대
    await mysqlUtil.create('tb_travel_member', {
      travelIdx: travel.idx,
      memberName,
      userIdx: member.idx,
      active: false,
    });
  }

  // todo: 2. 가입안한 애인데 초대받고 가입할 애
  else {
  }

  // todo: 3. 가입안했고 앞으로도 안할 애

  return { statusCode: 200, body: JSON.stringify({}) };
};
