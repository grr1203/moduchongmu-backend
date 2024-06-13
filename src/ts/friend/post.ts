import { APIGatewayProxyEventV2WithLambdaAuthorizer } from 'aws-lambda';
import mysqlUtil from '../lib/mysqlUtil';
import { FromSchema } from 'json-schema-to-ts';

const parameter = {
  type: 'object',
  properties: { newFriendName: { type: 'string' } },
  required: ['newFriendName'],
} as const;

// 내 친구목록에 친구 추가 (mapping table)
export const handler = async (event: APIGatewayProxyEventV2WithLambdaAuthorizer<{ [key: string]: any }>) => {
  console.log('[event]', event);
  const { newFriendName } = JSON.parse(event.body) as FromSchema<typeof parameter>;
  const userIdx = event.requestContext.authorizer.lambda.idx;

  const newFriend = await mysqlUtil.getOne('tb_user', ['idx'], { userName: newFriendName });

  // 이미 추가된 친구인지 확인
  const isAlreadyFriend = await mysqlUtil.getOne('tb_friend_mapping', [], { userIdx, friendIdx: newFriend.idx });

  // 친구 추가
  isAlreadyFriend ?? (await mysqlUtil.create('tb_friend_mapping', { userIdx, friendIdx: newFriend.idx }));

  // todo: 추가된 친구에게 푸시알림 발송

  return { statusCode: 200, body: JSON.stringify({ newFriendName, isAlreadyFriend: isAlreadyFriend ? true : false }) };
};
