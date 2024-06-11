import { APIGatewayProxyEventV2WithLambdaAuthorizer } from 'aws-lambda';
import mysqlUtil from '../../lib/mysqlUtil';

export const handler = async (event: APIGatewayProxyEventV2WithLambdaAuthorizer<{ [key: string]: any }>) => {
  console.log('[event]', event);

  await mysqlUtil.update('tb_user', { refreshToken: null }, { idx: event.requestContext.authorizer.lambda.idx });
  console.log(`successfully update refresh token to null`);

  return { statusCode: 200, body: JSON.stringify({}) };
};
