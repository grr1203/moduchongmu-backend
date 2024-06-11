import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { generateUserAccessToken, verifyJwtKey } from '../../lib/jwt';
import mysqlUtil from '../../lib/mysqlUtil';
import { FromSchema } from 'json-schema-to-ts';

const parameter = {
  type: 'object',
  properties: {
    refreshToken: { type: 'string' },
  },
  required: ['refreshToken'],
} as const;

export const handler = async (event: APIGatewayProxyEventV2) => {
  console.log('[event]', event);
  const { refreshToken } = event.queryStringParameters as FromSchema<typeof parameter>;

  const result = verifyJwtKey(refreshToken);
  if (result.verified === false) return { statusCode: 401, body: JSON.stringify({ code: 'Invalid_Token' }) };

  const user = await mysqlUtil.getOne('tb_user', [], { idx: result.decoded['idx'] });
  if (!user) return { statusCode: 404, body: JSON.stringify({ code: 'User_Not_Found' }) };

  // 유효하지 않은 token이거나 login 등으로 refresh token 재발급 된 경우
  if (user.refresh_token !== refreshToken) {
    console.log(`refresh token is not match with DB stored refresh token`);
    return { statusCode: 401, body: JSON.stringify({ code: 'Invalid_Token' }) };
  }

  const accessToken = await generateUserAccessToken(user.idx);

  return { statusCode: 200, body: JSON.stringify({ accessToken }) };
};
