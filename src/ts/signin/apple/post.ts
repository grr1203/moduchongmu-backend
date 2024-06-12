import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { FromSchema } from 'json-schema-to-ts';
import mysqlUtil from '../../lib/mysqlUtil';
import { generateTokens } from '../../lib/jwt';
import { verifyAppleToken } from '../../lib/loginUtil';
import { USER_REGISTER_TYPE } from '../../lib/constants/user';

const parameter = {
  type: 'object',
  properties: {
    identityToken: { type: 'string' }, // apple에서 발급한 identityToken (email 포함)
  },
  required: ['identityToken'],
} as const;

export const handler = async (event: APIGatewayProxyEventV2) => {
  console.log('[event]', event);
  const { identityToken } = JSON.parse(event.body) as FromSchema<typeof parameter>;

  try {
    // apple server에서 발급한 identityToken 검증 및 payload 조회
    let userEmail: string;
    try {
      const jwtClaims = await verifyAppleToken(identityToken);
      if (Object.keys(jwtClaims).length === 0) throw Error('jwtClaims is empty');
      console.log('[jwtClaims]', jwtClaims);
      userEmail = jwtClaims.email;
    } catch (err) {
      console.log('[verifyAppleToken failed]', err);
      return { statusCode: 401, body: JSON.stringify({ code: 'Verification_Failed' }) };
    }

    let user = userEmail && (await mysqlUtil.getOne('tb_user', [], { userEmail }));
    const processType = user?.userName ? 'signin' : 'signup';
    // 회원가입
    if (processType === 'signup') {
      await mysqlUtil.create('tb_user', { userEmail, registerType: USER_REGISTER_TYPE.APPLE, marketingAgreed: 1 });
      user = await mysqlUtil.getOne('tb_user', [], { userEmail });
    }

    // 로그인
    await mysqlUtil.updateTimestamp('tb_user', 'lastLoginDate', { idx: user!.idx });
    const { accessToken, refreshToken } = await generateTokens(event, user!.idx);

    return { statusCode: 200, body: JSON.stringify({ processType, accessToken, refreshToken }) };
  } catch (err) {
    console.log('err', err);
    return { statusCode: 500, body: JSON.stringify({ code: 'Internal_Server_Error' }) };
  }
};
