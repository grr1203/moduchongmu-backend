import { APIGatewayProxyEventV2WithLambdaAuthorizer } from 'aws-lambda';
import { formatTravel } from '../../lib/travel';
import { FromSchema } from 'json-schema-to-ts';
import mysqlUtil from '../../lib/mysqlUtil';

const parameter = {
  type: 'object',
  properties: {
    pageSize: { type: 'number' },
    page: { type: 'number' },
  },
  required: ['pageSize', 'page'],
} as const;

export const handler = async (event: APIGatewayProxyEventV2WithLambdaAuthorizer<{ [key: string]: any }>) => {
  console.log('[event]', event);
  const { pageSize, page } = event.queryStringParameters as FromSchema<typeof parameter>;
  const userIdx = event.requestContext.authorizer.lambda.idx;

  // 참여중인 여행 목록 조회
  const travelIdxArray = (
    await mysqlUtil.getMany('tb_travel_member', ['travelIdx'], { where: { userIdx }, order: [['idx', 'desc']] })
  ).map((e) => e.travelIdx);
  const totalCount = travelIdxArray.length;

  // pagenation
  const startIndex = (page - 1) * pageSize;
  let endIndex = startIndex + pageSize;
  if (totalCount < startIndex + 1) return { statusCode: 200, body: JSON.stringify({ travelList: [], totalCount }) };
  if (totalCount < endIndex) endIndex = totalCount;

  const travelArray = await mysqlUtil.getMany('tb_travel', [], {
    where: { idx: travelIdxArray.slice(startIndex, endIndex) },
    order: [['idx', 'desc']],
  });
  const travelList = await Promise.all(travelArray.map(async (travel) => formatTravel(travel as any)));

  // 현재 진행중인 여행 조회
  const travelData: object[] = await mysqlUtil.raw(
    `SELECT * FROM tb_travel WHERE idx IN (${travelIdxArray.join(', ')}) AND '${
      new Date(new Date().getTime() + 9 * 60 * 60 * 1000).toISOString().split('T')[0]
    }' BETWEEN startDate AND endDate order by idx desc;`
  );
  const currentTravel = travelData.length > 0 ? await formatTravel(travelData[0] as any) : null;

  return { statusCode: 200, body: JSON.stringify({ currentTravel, travelList, totalCount }) };
};
