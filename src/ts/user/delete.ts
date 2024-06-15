import { APIGatewayProxyEventV2WithLambdaAuthorizer } from 'aws-lambda';
import mysqlUtil from '../lib/mysqlUtil';

export const handler = async (event: APIGatewayProxyEventV2WithLambdaAuthorizer<{ [key: string]: any }>) => {
  console.log('[event]', event);
  const userIdx = event.requestContext.authorizer.lambda.idx;
  const userEmail = event.requestContext.authorizer.lambda.userEmail;

  await mysqlUtil.deleteMany('tb_user', { idx: userIdx });
  console.log(`delete user ${userEmail} success`);

  return { statusCode: 200, body: JSON.stringify({ userEmail }) };
};
