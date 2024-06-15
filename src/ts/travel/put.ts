import { APIGatewayProxyEventV2WithLambdaAuthorizer } from 'aws-lambda';
import mysqlUtil from '../lib/mysqlUtil';
import { FromSchema } from 'json-schema-to-ts';
import { checkTravelMember, formatTravel, getTravelCoverImageKey } from '../lib/travel';
import { getPresignedPostUrl } from '../lib/aws/s3Util';

const parameter = {
  type: 'object',
  properties: {
    uid: { type: 'string' },
    travelName: { type: 'string' },
    destination: { type: 'string' },
    startDate: { type: 'string' }, // Date - yyyy-mm-dd
    endDate: { type: 'string' }, // Date - yyyy-mm-dd
    memo: { type: 'string' },
    settlementDone: { type: 'boolean' },
    memberArray: { type: 'array', items: { type: 'string' } }, // 멤버 삭제시에만 사용
    coverImage: { type: 'boolean' }, // true면 업로드 url 전달
  },
  required: ['uid'],
} as const;

export const handler = async (event: APIGatewayProxyEventV2WithLambdaAuthorizer<{ [key: string]: any }>) => {
  console.log('[event]', event);
  const {
    uid,
    travelName,
    destination,
    startDate,
    endDate,
    memo,
    settlementDone,
    memberArray: newMemberArray,
    coverImage,
  } = JSON.parse(event.body) as FromSchema<typeof parameter>;
  const userIdx = event.requestContext.authorizer.lambda.idx;

  // 자기가 포함된 여행방인지 체크
  const { isMember, travel: travelData } = await checkTravelMember(uid, userIdx);
  if (!isMember) return { statusCode: 403, body: JSON.stringify({ code: 'NOT_MEMBER' }) };

  const updateObject: { [key: string]: any } = {};
  travelName && (updateObject.travelName = travelName);
  destination && (updateObject.destination = destination);
  startDate && (updateObject.startDate = startDate);
  endDate && (updateObject.endDate = endDate);
  memo && (updateObject.memo = memo);
  typeof settlementDone === 'boolean' && (updateObject.settlementDone = settlementDone);

  // 멤버 삭제만 처리
  if (Array.isArray(newMemberArray)) {
    const originMemberArray = (
      await mysqlUtil.getMany('tb_travel_member', ['memberName'], { travelIdx: travelData.idx })
    ).map((member) => member.memberName);
    for (const memberName of originMemberArray.filter((memberName) => !newMemberArray.includes(memberName))) {
      await mysqlUtil.deleteMany('tb_travel_member', { travelIdx: travelData.idx, memberName });
    }
  }

  // 커버 이미지 수정 요청시 s3 presigned url 발급
  const postingImageUrl = coverImage ? await getPresignedPostUrl(getTravelCoverImageKey(uid)) : null;
  postingImageUrl && (updateObject.coverImgUrl = postingImageUrl);

  await mysqlUtil.update('tb_travel', updateObject, { uid });

  const travel = await formatTravel({ ...travelData, ...updateObject } as any);

  return { statusCode: 200, body: JSON.stringify({ travel, postingImageUrl }) };
};
