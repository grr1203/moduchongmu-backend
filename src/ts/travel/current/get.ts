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

  // 자신의 여행 목록 중에 현재 여행중인 방 조회
  const travelIdxList = (await mysqlUtil.getMany('tb_travel_member', ['travelIdx'], { userIdx })).map(
    (e) => e.travelIdx
  );
  const travelData: object[] = await mysqlUtil.raw(
    `SELECT * FROM tb_travel WHERE idx IN (${travelIdxList.join(
      ', '
    )}) AND '${currentDate}' BETWEEN startDate AND endDate order by idx desc;`
  );
  const travel = travelData.length > 0 ? await formatTravel(travelData[0] as any) : null;

  // 종료된 여행 중에 정산 전인 여행 조회
  const unsettledTravelData: object[] = await mysqlUtil.raw(
    `SELECT * FROM tb_travel WHERE idx IN (${travelIdxList.join(
      ', '
    )}) AND '${currentDate}' > endDate AND settlementDone = 0 order by idx desc;`
  );
  const unsettledTravel = unsettledTravelData.length > 0 ? await formatTravel(unsettledTravelData[0] as any) : null;

  return { statusCode: 200, body: JSON.stringify({ travel, unsettledTravel }) };
};
