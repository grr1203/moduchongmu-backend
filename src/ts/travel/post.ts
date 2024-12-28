import { APIGatewayProxyEventV2WithLambdaAuthorizer } from 'aws-lambda';
import mysqlUtil from '../lib/mysqlUtil';
import { FromSchema } from 'json-schema-to-ts';
import { formatTravel, getTravelCoverImageKey } from '../lib/travel';
import { nanoid } from 'nanoid';
import axios from 'axios';
import { getPresignedPostUrl } from '../lib/aws/s3Util';

const parameter = {
  type: 'object',
  properties: {
    travelName: { type: 'string' },
    country: { type: 'string' },
    city: { type: 'string' },
    startDate: { type: 'string' }, // Date - yyyy-mm-dd
    endDate: { type: 'string' }, // Date - yyyy-mm-dd
    memo: { type: 'string' },
  },
  required: ['travelName', 'country', 'city', 'startDate', 'endDate'],
} as const;

export const handler = async (event: APIGatewayProxyEventV2WithLambdaAuthorizer<{ [key: string]: any }>) => {
  console.log('[event]', event);
  const { travelName, country, city, startDate, endDate, memo } = JSON.parse(event.body) as FromSchema<
    typeof parameter
  >;
  const userIdx = event.requestContext.authorizer.lambda.idx;

  // 통화 조회
  let currencyName, currencySymbol;
  try {
    const res = await axios.get(`https://restcountries.com/v3.1/translation/${country}`);
    currencyName = Object.keys(res.data[0].currencies)[0] ?? '알수없음';
    currencySymbol = res.data[0].currencies[currencyName].symbol ?? '';
  } catch (err) {
    console.log(`${country} 통화 조회 err`, err);
    currencyName = '알수없음';
    currencySymbol = '';
  }

  // 여행 방 생성 및 멤버로 자신 추가
  const travelUid = nanoid(10)
  const travelIdx = await mysqlUtil.create('tb_travel', {
    uid: travelUid,
    hostIdx: userIdx,
    travelName,
    country,
    city,
    startDate,
    endDate,
    currency: `${currencyName}(${currencySymbol})`,
    memo,
  });
  await mysqlUtil.create('tb_travel_member', { travelIdx, userIdx });

  // 조회
  const travelData = await mysqlUtil.getOne('tb_travel', [], { hostIdx: userIdx, travelName });
  const travel = await formatTravel(travelData as any);

  const postingImageUrl = await getPresignedPostUrl(getTravelCoverImageKey(travelUid));

  return { statusCode: 200, body: JSON.stringify({ travel, postingImageUrl }) };
};
