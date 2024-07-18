import { APIGatewayProxyEventV2WithLambdaAuthorizer } from 'aws-lambda';
import mysqlUtil from '../lib/mysqlUtil';
import { FromSchema } from 'json-schema-to-ts';
import { formatTravel } from '../lib/travel';
import { nanoid } from 'nanoid';
import axios from 'axios';

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
  const userName = event.requestContext.authorizer.lambda.userName;

  // 통화 조회
  const res = await axios.get(`https://restcountries.com/v3.1/translation/${country}`);
  const currencyName = Object.keys(res.data[0].currencies)[0] ?? '알수없음';
  const currencySymbol = res.data[0].currencies[currencyName].symbol ?? '';

  // 여행 방 생성 및 멤버로 자신 추가
  const travelIdx = await mysqlUtil.create('tb_travel', {
    uid: nanoid(10),
    hostIdx: userIdx,
    travelName,
    country,
    city,
    startDate,
    endDate,
    currency: `${currencyName}(${currencySymbol})`,
    memo,
  });
  await mysqlUtil.create('tb_travel_member', { travelIdx, memberName: userName, userIdx, active: true });

  // 조회
  const travelData = await mysqlUtil.getOne('tb_travel', [], { hostIdx: userIdx, travelName });
  const travel = await formatTravel(travelData as any);

  return { statusCode: 200, body: JSON.stringify({ travel }) };
};
