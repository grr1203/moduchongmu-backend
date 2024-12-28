import { APIGatewayProxyEventV2WithLambdaAuthorizer } from 'aws-lambda';
import { USER_JWT_CONTENTS } from '../lib/jwt';
import mysqlUtil from '../lib/mysqlUtil';
import { getPresignedUrl } from '../lib/aws/s3Util';
import { getUserProfileImageKey } from '../lib/user';

export const handler = async (event: APIGatewayProxyEventV2WithLambdaAuthorizer<{ [key: string]: any }>) => {
  console.log('[event]', event);
  const userIdx = event.requestContext.authorizer.lambda.idx;

  // 유저 정보 조회
  const userColumns = [...USER_JWT_CONTENTS, 'marketingAgreed'];
  const user = await mysqlUtil.getOne('tb_user', userColumns, { idx: userIdx });
  delete user.idx;

  let profileImageUrl;
  try {
    profileImageUrl = await getPresignedUrl(getUserProfileImageKey(user.userEmail));
  } catch (error) {
    console.error('Error:', error);
    profileImageUrl = null;
  }

  return { statusCode: 200, body: JSON.stringify({ user, profileImageUrl }) };
};
