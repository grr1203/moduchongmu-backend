import { APIGatewayProxyEventV2WithLambdaAuthorizer } from 'aws-lambda';
import mysqlUtil from '../lib/mysqlUtil';
import { FromSchema } from 'json-schema-to-ts';
import { formatTravel } from '../lib/travel';

const parameter = {
  type: 'object',
  properties: {
    travelName: { type: 'string' },
    destination: { type: 'string' },
    startDate: { type: 'string' }, // Date - yyyy-mm-dd
    endDate: { type: 'string' }, // Date - yyyy-mm-dd
    memo: { type: 'string' },
  },
  required: ['travelName', 'destination', 'startDate', 'endDate'],
} as const;

export const handler = async (event: APIGatewayProxyEventV2WithLambdaAuthorizer<{ [key: string]: any }>) => {
  console.log('[event]', event);
  const { travelName, destination, startDate, endDate, memo } = JSON.parse(event.body) as FromSchema<typeof parameter>;
  const userIdx = event.requestContext.authorizer.lambda.idx;
  const userName = event.requestContext.authorizer.lambda.userName;

  // hostIdx - travelName (unique)으로 중복 체크
  const isExist = await mysqlUtil.getOne('tb_travel', [], { hostIdx: userIdx, travelName });
  if (isExist) return { statusCode: 409, body: JSON.stringify({ code: 'ALREADY_EXIST_TRAVEL_NAME' }) };

  // 여행 방 생성 및 멤버로 자신 추가
  const travelIdx = await mysqlUtil.create('tb_travel', {
    hostIdx: userIdx,
    travelName,
    destination,
    startDate,
    endDate,
    memo,
  });
  await mysqlUtil.create('tb_travel_member', { travelIdx, memberName: userName, userIdx });
  
  // 조회
  const travelData = await mysqlUtil.getOne('tb_travel', [], { hostIdx: userIdx, travelName });
  const travel = await formatTravel(travelData as any);

  return { statusCode: 200, body: JSON.stringify({ travel }) };
};
