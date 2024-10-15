import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { FromSchema } from 'json-schema-to-ts';
import mysqlUtil from '../../lib/mysqlUtil';
import { generateTokens } from '../../lib/jwt';
import { USER_REGISTER_TYPE } from '../../lib/constants/user';
import { verifyNaverCode } from '../../lib/loginUtil';

const parameter = {
  type: 'object',
  properties: {
    code: { type: 'string' }, // naver에서 발급한 access code
  },
  required: ['code'],
} as const;

export const handler = async (event: APIGatewayProxyEventV2) => {
  console.log('[event]', event);
  const { code } = JSON.parse(event.body) as FromSchema<typeof parameter>;

  try {
    // naver server에서 발급한 accss code 검증 및 payload 조회
    let userEmail: string;
    try {
      const { email } = await verifyNaverCode(code);
      userEmail = email;
    } catch (err) {
      console.log('[verifyNaverToken failed]', err);
      return { statusCode: 401, body: JSON.stringify({ code: 'Verification_Failed' }) };
    }

    let user = await mysqlUtil.getOne('tb_user', [], { userEmail });
    // const processType = user?.userName ? 'signin' : 'signup';
    const processType = !user ? 'signup' : user?.userName ? 'signin': 'signup-ing';
    // 회원가입
    if (processType === 'signup') {
      await mysqlUtil.create('tb_user', { userEmail, registerType: USER_REGISTER_TYPE.NAVER, marketingAgreed: 1 });
      user = await mysqlUtil.getOne('tb_user', [], { userEmail });
    } 

    // 로그인
    await mysqlUtil.updateTimestamp('tb_user', 'lastLoginDate', { idx: user.idx });
    const { accessToken, refreshToken } = await generateTokens(event, user.idx);

    return { statusCode: 200, body: JSON.stringify({ processType, accessToken, refreshToken }) };
  } catch (err) {
    console.log('err', err);
    return { statusCode: 500, body: JSON.stringify({ code: 'Internal_Server_Error' }) };
  }
};
