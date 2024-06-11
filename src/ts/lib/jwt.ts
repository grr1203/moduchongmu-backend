import jwt from 'jsonwebtoken';
import mysqlUtil from './mysqlUtil';
import dayjs from 'dayjs';
import { APIGatewayProxyEventV2 } from 'aws-lambda';

// openssl rand -hex 128
const secretKey: string = process.env.jwt_secret_key || 'temp_secret_key_monthconcert';

export const USER_JWT_CONTENTS = ['idx', 'uid', 'user_email', 'user_name', 'register_type', 'registered_date'];

export const generateJwt = (data: object, exp: string | number) => {
  return jwt.sign({ ...data }, secretKey, { expiresIn: exp });
};

export const verifyJwtKey = (
  token: string
): { verified: true; decoded: jwt.JwtPayload } | { verified: false; err: string } => {
  try {
    const decoded = jwt.verify(token, secretKey);
    console.log('[verifyJwtKey decoded]', decoded);
    if (typeof decoded === 'string') throw Error('decoded jwt is string, not JwtPayload');
    return { verified: true, decoded };
  } catch (err) {
    console.log('[verifyJwtKey failed]', err);
    return { verified: false, err: err.name };
  }
};

export const generateUserAccessToken = async (userIdx: number, exp = 60 * 30) => {
  const user = await mysqlUtil.getOne('tb_user', [...USER_JWT_CONTENTS], { idx: userIdx });
  if (!user) throw new Error(`user not found: userIdx = ${userIdx}`);

  const jwt_item = { first_jwt_iat: dayjs().format('YYYY-MM-DD HH:mm:ss') };
  for (const content of USER_JWT_CONTENTS) {
    const value = user[content];
    if (value === undefined) {
      console.log(`failed to make jwt key with jwt_content, users ${content} is undefined`);
      throw new Error(`failed to make jwt key`);
    }
    jwt_item[content] = value;
  }
  return generateJwt(jwt_item, exp);
};

export const generateUserRefreshToken = async (lambda_event: APIGatewayProxyEventV2, user_idx: number) => {
  let user_ip = lambda_event.requestContext.http.sourceIp;
  console.log(`user_ip = ${user_ip}`);
  const jwt_item = { ip: user_ip, idx: user_idx };
  const token = generateJwt(jwt_item, '180d');

  try {
    await mysqlUtil.update('tb_user', { refresh_token: token }, { idx: user_idx });
    console.log('successfully update refresh_token');
  } catch (e) {
    console.log(`falied to put refresh token`);
  }
  return token;
};

export const generateTokens = async (lambda_event: APIGatewayProxyEventV2, userIdx: number) => {
  const accessToken = await generateUserAccessToken(userIdx);
  const refreshToken = await generateUserRefreshToken(lambda_event, userIdx);
  return { accessToken, refreshToken };
};
