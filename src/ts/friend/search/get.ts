import { APIGatewayProxyEventV2WithLambdaAuthorizer } from 'aws-lambda';
import mysqlUtil from '../../lib/mysqlUtil';
import { FromSchema } from 'json-schema-to-ts';

const parameter = {
  type: 'object',
  properties: {
    searchString: { type: 'string' },
  },
  required: ['searchString'],
} as const;

export const handler = async (event: APIGatewayProxyEventV2WithLambdaAuthorizer<{ [key: string]: any }>) => {
  console.log('[event]', event);
  const { searchString } = event.queryStringParameters as FromSchema<typeof parameter>;

  // 유저 검색
  const searchedUserArray = await mysqlUtil.search('tb_user', ['userEmail', 'userName'], searchString);
  const userArray = searchedUserArray.map((user: { userEmail: string; userName: string }) => {
    return { userEmail: user.userEmail, userName: user.userName };
  });

  return { statusCode: 200, body: JSON.stringify({ userArray }) };
};
