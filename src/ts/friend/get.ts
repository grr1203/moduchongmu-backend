import { APIGatewayProxyEventV2WithLambdaAuthorizer } from 'aws-lambda';
import mysqlUtil from '../lib/mysqlUtil';
import { FromSchema } from 'json-schema-to-ts';
import { idxToUser } from '../lib/user';

const parameter = {
  type: 'object',
  properties: {
    option: { type: 'string', enum: ['friend', 'beforeFriend'] },
  },
  required: [],
} as const;

export const handler = async (event: APIGatewayProxyEventV2WithLambdaAuthorizer<{ [key: string]: any }>) => {
  console.log('[event]', event);
  const { option } = event.queryStringParameters as FromSchema<typeof parameter>;
  const userIdx = event.requestContext.authorizer.lambda.idx;

  // 내 친구목록 가져오기
  let friendArray: string[] | null = null;
  let friendIdxArray: number[];
  if (!option || option === 'friend') {
    friendIdxArray = (await mysqlUtil.getMany('tb_friend_mapping', ['friendIdx'], { userIdx })).map(
      (e) => e.friendIdx
    );
    friendArray = (await idxToUser(friendIdxArray)).map((e) => e.userName);
    console.log('friendArray', friendArray);
  }

  // 나를 추가했는데 내가 친구로 추가하지 않은 친구목록 가져오기
  let beforeFriendArray: string[] | null = null;
  if (!option || option === 'beforeFriend') {
    const addMeUserIdxArray = (await mysqlUtil.getMany('tb_friend_mapping', ['userIdx'], { friendIdx: userIdx })).map(
      (e) => e.userIdx
    );
    const beforeFriendIdxArray = addMeUserIdxArray.filter((element) => !friendIdxArray.includes(element));
    beforeFriendArray = (await idxToUser(beforeFriendIdxArray)).map((e) => e.userName);
    console.log('beforeFriendArray', beforeFriendArray);
  }

  return { statusCode: 200, body: JSON.stringify({ friendArray, beforeFriendArray }) };
};

// const friendArray = await mysqlUtil.raw(
//     `SELECT tb_user.userName, tb_user.userEmail FROM tb_user
//       LEFT JOIN tb_friend_mapping ON tb_user.idx = tb_friend_mapping.friendIdx
//       WHERE tb_friend_mapping.userIdx = ${userIdx}`
//   );
