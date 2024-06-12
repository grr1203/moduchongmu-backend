import jwt from 'jsonwebtoken';
import mysqlUtil from './mysqlUtil';
import dayjs from 'dayjs';
import { APIGatewayProxyEventV2 } from 'aws-lambda';

// openssl rand -hex 128
const secretKey: string = process.env.JWT_SECRET_KEY || 'temp_secret_key_monthconcert';

export const USER_JWT_CONTENTS = ['idx', 'userEmail', 'userName', 'registerType', 'registeredDate', 'lastLoginDate'];

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

export const generateUserAccessToken = async (userIdx: number, exp = 60 * 60) => {
  const user = await mysqlUtil.getOne('tb_user', [...USER_JWT_CONTENTS], { idx: userIdx });
  if (!user) throw new Error(`user not found: userIdx = ${userIdx}`);

  const jwtItem = { first_jwt_iat: dayjs().format('YYYY-MM-DD HH:mm:ss') };
  for (const content of USER_JWT_CONTENTS) {
    const value = user[content];
    if (value === undefined) {
      console.log(`failed to make jwt key with jwt content, users ${content} is undefined`);
      throw new Error(`failed to make jwt key`);
    }
    jwtItem[content] = value;
  }
  return generateJwt(jwtItem, exp);
};

export const generateUserRefreshToken = async (lambdaEvent: APIGatewayProxyEventV2, userIdx: number) => {
  let userIp = lambdaEvent.requestContext.http.sourceIp;
  console.log(`userIp = ${userIp}`);
  const jwtItem = { ip: userIp, idx: userIdx };
  const token = generateJwt(jwtItem, '180d');

  try {
    await mysqlUtil.update('tb_user', { refreshToken: token }, { idx: userIdx });
    console.log('successfully update refresh token');
  } catch (e) {
    console.log(`falied to put refresh token`);
  }
  return token;
};

export const generateTokens = async (lambdaEvent: APIGatewayProxyEventV2, userIdx: number) => {
  const accessToken = await generateUserAccessToken(userIdx);
  const refreshToken = await generateUserRefreshToken(lambdaEvent, userIdx);
  return { accessToken, refreshToken };
};
