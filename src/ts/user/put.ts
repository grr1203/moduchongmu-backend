import { APIGatewayProxyEventV2WithLambdaAuthorizer } from 'aws-lambda';
import { USER_JWT_CONTENTS } from '../lib/jwt';
import mysqlUtil from '../lib/mysqlUtil';
import { FromSchema } from 'json-schema-to-ts';

const parameter = {
  type: 'object',
  properties: {
    userName: { type: 'string' },
    marketingAgreed: { type: 'boolean' },
  },
  required: [],
} as const;

export const handler = async (event: APIGatewayProxyEventV2WithLambdaAuthorizer<{ [key: string]: any }>) => {
  console.log('[event]', event);
  const { userName, marketingAgreed } = JSON.parse(event.body) as FromSchema<typeof parameter>;
  const userIdx = event.requestContext.authorizer.lambda.idx;

  const updateObject: { [key: string]: any } = {};
  userName && typeof userName === 'string' && (updateObject.userName = userName);
  marketingAgreed && typeof marketingAgreed === 'boolean' && (updateObject.marketingAgreed = marketingAgreed);
  await mysqlUtil.update('tb_user', updateObject, { idx: userIdx });

  const userColumns = [...USER_JWT_CONTENTS, 'marketing_agreed'];
  const user = await mysqlUtil.getOne('tb_user', userColumns, { idx: userIdx });
  delete user.idx;

  return { statusCode: 200, body: JSON.stringify({ user }) };
};
