import { APIGatewayProxyEventV2WithLambdaAuthorizer } from 'aws-lambda';
import { FromSchema } from 'json-schema-to-ts';
import mysqlUtil from '../../lib/mysqlUtil';
import { formatTravel } from '../../lib/travel';

const parameter = {
  type: 'object',
  properties: {
    currentDate: { type: 'string' }, // 현지 시간 정보 YYYY-MM-DD
  },
  required: [],
} as const;

export const handler = async (event: APIGatewayProxyEventV2WithLambdaAuthorizer<{ [key: string]: any }>) => {
  console.log('[event]', event);
  let { currentDate } = event.queryStringParameters as FromSchema<typeof parameter>;
  const userIdx = event.requestContext.authorizer.lambda.idx;

  // 현재 시간 변환 - 기기의 현지 시간 | 서버 시간 기준으로 계산한 한국 시간
  currentDate = currentDate || new Date(new Date().getTime() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
  console.log('[currentDate]', currentDate);

  // 참여중인 여행 목록 조회
  const travelIdxArray = (await mysqlUtil.getMany('tb_travel_member', ['travelIdx'], { active: true, userIdx })).map(
    (e) => e.travelIdx
  );
  
  // 현재 여행중인 방 조회
  const travelData: object[] = await mysqlUtil.raw(
    `SELECT * FROM tb_travel WHERE idx IN (${travelIdxArray.join(
      ', '
    )}) AND '${currentDate}' BETWEEN startDate AND endDate order by idx desc;`
  );
  const travel = travelData.length > 0 ? await formatTravel(travelData[0] as any) : null;

  // 초대받았지만 참여 전인 여행 조회
  const invitedTravelIdxArray: object[] = (
    await mysqlUtil.getMany('tb_travel_member', ['travelIdx'], {
      active: false,
      userIdx,
    })
  ).map((e) => e.travelIdx);
  const invitedTravelData: object[] = await mysqlUtil.raw(
    `SELECT * FROM tb_travel WHERE idx IN (${invitedTravelIdxArray.join(', ')}) order by idx desc;`
  );
  const invitedTravel = invitedTravelData.length > 0 ? await formatTravel(invitedTravelData[0] as any) : null;

  // 종료된 여행 중에 정산 전인 여행 조회
  const unsettledTravelData: object[] = await mysqlUtil.raw(
    `SELECT * FROM tb_travel WHERE idx IN (${travelIdxArray.join(
      ', '
    )}) AND '${currentDate}' > endDate AND settlementDone = 0 order by idx desc;`
  );
  const unsettledTravel = unsettledTravelData.length > 0 ? await formatTravel(unsettledTravelData[0] as any) : null;

  return { statusCode: 200, body: JSON.stringify({ travel, invitedTravel, unsettledTravel }) };
};
