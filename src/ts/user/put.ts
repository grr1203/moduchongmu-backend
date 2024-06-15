import { APIGatewayProxyEventV2WithLambdaAuthorizer } from 'aws-lambda';
import { USER_JWT_CONTENTS } from '../lib/jwt';
import mysqlUtil from '../lib/mysqlUtil';
import { FromSchema } from 'json-schema-to-ts';
import { getUserProfileImageKey } from '../lib/user';
import { getPresignedPostUrl } from '../lib/aws/s3Util';

const parameter = {
  type: 'object',
  properties: {
    userName: { type: 'string' },
    marketingAgreed: { type: 'boolean' },
    statusMessage: { type: 'string' },
    profileImage: { type: 'boolean' },
  },
  required: [],
} as const;

export const handler = async (event: APIGatewayProxyEventV2WithLambdaAuthorizer<{ [key: string]: any }>) => {
  console.log('[event]', event);
  const { userName, marketingAgreed, statusMessage, profileImage } = JSON.parse(event.body) as FromSchema<
    typeof parameter
  >;
  const userIdx = event.requestContext.authorizer.lambda.idx;

  const updateObject: { [key: string]: any } = {};
  userName && typeof userName === 'string' && (updateObject.userName = userName);
  typeof marketingAgreed === 'boolean' && (updateObject.marketingAgreed = marketingAgreed);
  statusMessage && typeof statusMessage === 'string' && (updateObject.statusMessage = statusMessage);

  // userName unique check
  const existUserName = await mysqlUtil.getOne('tb_user', ['idx'], { userName });
  if (existUserName) return { statusCode: 400, body: JSON.stringify({ code: 'UserName_Exist' }) };

  await mysqlUtil.update('tb_user', updateObject, { idx: userIdx });

  const user = await mysqlUtil.getOne('tb_user', [...USER_JWT_CONTENTS, 'marketing_agreed'], { idx: userIdx });
  delete user.idx;

  const profileImageUrl = profileImage ? await getPresignedPostUrl(getUserProfileImageKey(user.email)) : null;

  return { statusCode: 200, body: JSON.stringify({ user, profileImageUrl }) };
};
