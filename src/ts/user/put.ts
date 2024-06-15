import { APIGatewayProxyEventV2WithLambdaAuthorizer } from 'aws-lambda';
import { USER_JWT_CONTENTS } from '../lib/jwt';
import mysqlUtil from '../lib/mysqlUtil';
import { FromSchema } from 'json-schema-to-ts';

const parameter = {
  type: 'object',
  properties: {
    userName: { type: 'string' },
    marketingAgreed: { type: 'boolean' },
    statusMessage: { type: 'string' },
  },
  required: [],
} as const;

export const handler = async (event: APIGatewayProxyEventV2WithLambdaAuthorizer<{ [key: string]: any }>) => {
  console.log('[event]', event);
  const { userName, marketingAgreed, statusMessage } = JSON.parse(event.body) as FromSchema<typeof parameter>;
  const userIdx = event.requestContext.authorizer.lambda.idx;

  const updateObject: { [key: string]: any } = {};
  userName && typeof userName === 'string' && (updateObject.userName = userName);
  typeof marketingAgreed === 'boolean' && (updateObject.marketingAgreed = marketingAgreed);
  statusMessage && typeof statusMessage === 'string' && (updateObject.statusMessage = statusMessage);

  // userName unique check
  const existUserName = await mysqlUtil.getOne('tb_user', ['idx'], { userName });
  if (existUserName) return { statusCode: 400, body: JSON.stringify({ code: 'UserName_Exist' }) };

  await mysqlUtil.update('tb_user', updateObject, { idx: userIdx });

  const userColumns = [...USER_JWT_CONTENTS, 'marketing_agreed'];
  const user = await mysqlUtil.getOne('tb_user', userColumns, { idx: userIdx });
  delete user.idx;

  return { statusCode: 200, body: JSON.stringify({ user }) };
};
