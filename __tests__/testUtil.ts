import { generateTokens, USER_JWT_CONTENTS } from '../src/ts/lib/jwt';
import mysqlUtil from '../src/ts/lib/mysqlUtil';
import * as authorizer from '../src/ts/auth/authorizer';
import { APIGatewayProxyEventV2, APIGatewayProxyEventV2WithLambdaAuthorizer } from 'aws-lambda';
import util from 'util';

const testEmail = 'gyrms9412@naver.com';

export async function localLogin(userEmail: string = testEmail): Promise<string> {
  const user = await mysqlUtil.getOne('tb_user', USER_JWT_CONTENTS, { userEmail });
  return (await generateTokens(createPublicLambdaEvent({}), user!.idx)).accessToken;
}

export async function privateFunctionTest(testFunction, parameters: { [key: string]: any }) {
  const userAccessToken = await localLogin();
  const event = await createPrivateLambdaEvent(parameters, userAccessToken);
  const response = await testFunction(event);
  console.log(util.inspect(JSON.parse(response.body), { depth: null }));
  return response;
}

export const createPublicLambdaEvent = (parameters: { [key: string]: any }): APIGatewayProxyEventV2 => {
  return {
    version: '2.0',
    routeKey: '',
    rawPath: '',
    rawQueryString: '',
    headers: {
      origin: 'https://test.ai',
    },
    queryStringParameters: parameters,
    body: JSON.stringify(parameters),
    requestContext: {
      accountId: 'testAccountId',
      apiId: 'testApiId',
      domainName: 'test.execute-api.ap-northeast-2.amazonaws.com',
      domainPrefix: 'test',
      http: {
        method: '',
        path: '/',
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'local',
      },
      requestId: '',
      routeKey: '',
      stage: 'dev',
      time: '14/Dec/2023:00:00:00 +0000',
      timeEpoch: 0,
    },
    pathParameters: {},
    isBase64Encoded: false,
  };
};

export const createPublicLambdaEventPost = (body: { [key: string]: any }): APIGatewayProxyEventV2 => {
  return {
    version: '2.0',
    routeKey: '',
    rawPath: '',
    rawQueryString: '',
    headers: {
      origin: 'https://test.ai',
    },
    requestContext: {
      accountId: 'testAccountId',
      apiId: 'testApiId',
      domainName: 'test.execute-api.ap-northeast-2.amazonaws.com',
      domainPrefix: 'test',
      http: {
        method: '',
        path: '/',
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'local',
      },
      requestId: '',
      routeKey: 'POST ',
      stage: 'dev',
      time: '14/Dec/2023:00:00:00 +0000',
      timeEpoch: 0,
    },
    body: JSON.stringify(body),
    isBase64Encoded: false,
  };
};

export const createPrivateLambdaEvent = async (
  parameters: { [key: string]: any },
  userAccessToken: string
): Promise<APIGatewayProxyEventV2WithLambdaAuthorizer<{ [key: string]: any }>> => {
  const { context: jwtClaims } = await authorizer.handler({
    ...createPublicLambdaEvent(parameters),
    headers: { authorization: `Bearer ${userAccessToken}` },
  });
  return {
    version: '2.0',
    routeKey: '',
    rawPath: '',
    rawQueryString: '',
    headers: { authorization: `Bearer ${userAccessToken}`, origin: 'https://test.ai' },
    queryStringParameters: parameters,
    body: JSON.stringify(parameters),
    requestContext: {
      accountId: 'testAccountId',
      apiId: 'testApiId',
      domainName: 'test.execute-api.ap-northeast-2.amazonaws.com',
      domainPrefix: 'test',
      http: {
        method: '',
        path: '/',
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'local',
      },
      requestId: '',
      routeKey: '',
      stage: 'dev',
      time: '14/Dec/2023:00:00:00 +0000',
      timeEpoch: 0,
      authorizer: { lambda: { ...jwtClaims } },
    },
    pathParameters: {},
    isBase64Encoded: false,
  };
};
