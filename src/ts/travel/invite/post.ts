import { APIGatewayProxyEventV2WithLambdaAuthorizer } from 'aws-lambda';
import mysqlUtil from '../../lib/mysqlUtil';
import { FromSchema } from 'json-schema-to-ts';

const parameter = {
  type: 'object',
  properties: {
    travelUid: { type: 'string' },
  },
  required: ['travelUid'],
} as const;

// 초대 링크에서 호출되는 API
export const handler = async (event: APIGatewayProxyEventV2WithLambdaAuthorizer<{ [key: string]: any }>) => {
  console.log('[event]', event);
  const { travelUid } = JSON.parse(event.body) as FromSchema<typeof parameter>;
  const userIdx = event.requestContext.authorizer.lambda.idx;

  const travel = await mysqlUtil.getOne('tb_travel', [], { uid: travelUid });
  const travelMemberIdxList = (await mysqlUtil.getMany('tb_travel_member', ['userIdx'], { travelIdx: travel.idx })).map(
    (member) => member.userIdx
  );

  // 이미 여행 방에 참여중인지 확인
  const isExist = await mysqlUtil.getOne('tb_travel_member', [], { travelIdx: travel.idx, userIdx });
  if (isExist) return { statusCode: 200, body: JSON.stringify({}) };

  // 여행 방에 참여
  await mysqlUtil.create('tb_travel_member', { travelIdx: travel.idx, userIdx });

  // 여행 방 참여시 방 유저들끼리 서로 친구로 등록 - tb_friend_mapping에 쌍방으로 등록
  for (const memberIdx of travelMemberIdxList) {
    const isExist = await mysqlUtil.getOne('tb_friend_mapping', [], { userIdx, friendIdx: memberIdx });
    if (!isExist) await mysqlUtil.create('tb_friend_mapping', { userIdx, friendIdx: memberIdx });
    const isExist2 = await mysqlUtil.getOne('tb_friend_mapping', [], { userIdx: memberIdx, friendIdx: userIdx });
    if (!isExist2) await mysqlUtil.create('tb_friend_mapping', { userIdx: memberIdx, friendIdx: userIdx });
  }

  return { statusCode: 200, body: JSON.stringify({}) };
};
