import { APIGatewayProxyEventV2WithLambdaAuthorizer } from 'aws-lambda';
import mysqlUtil from '../../lib/mysqlUtil';
import { formatTravel } from '../../lib/travel';

export const handler = async (event: APIGatewayProxyEventV2WithLambdaAuthorizer<{ [key: string]: any }>) => {
  console.log('[event]', event);
  const userIdx = event.requestContext.authorizer.lambda.idx;

  // 현재 진행중인 여행 조회
  const travelIdxArray = (await mysqlUtil.getMany('tb_travel_member', ['travelIdx'], { userIdx })).map(
    (e) => e.travelIdx
  );
  let travelData = (
    await mysqlUtil.raw(`SELECT * FROM tb_travel WHERE idx IN (
    ${travelIdxArray.join(', ')}) AND startDate <= NOW() AND endDate >= NOW() limit 1;`)
  )[0];

  // 여행중이 아닌 경우 앞으로 가장 가까운 여행 조회
  if (!travelData) {
    travelData = (
      await mysqlUtil.raw(
        `SELECT * FROM tb_travel WHERE idx IN (
      ${travelIdxArray.join(', ')}) AND startDate >= NOW() order by startDate asc limit 1;`
      )
    )[0];
  }

  const travel = travelData ? await formatTravel(travelData as any) : null;

  return { statusCode: 200, body: JSON.stringify({ travel }) };
};
