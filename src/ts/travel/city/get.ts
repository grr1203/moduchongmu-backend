import { APIGatewayProxyEventV2WithLambdaAuthorizer } from 'aws-lambda';
import { FromSchema } from 'json-schema-to-ts';
import { BucketUrl } from '../../lib/aws/s3Util';
import mysqlUtil from '../../lib/mysqlUtil';

const parameter = {
  type: 'object',
  properties: {
    searchString: { type: 'string' },
  },
  required: [],
} as const;

export const handler = async (event: APIGatewayProxyEventV2WithLambdaAuthorizer<{ [key: string]: any }>) => {
  console.log('[event]', event);
  const { searchString } = (event.queryStringParameters || {}) as FromSchema<typeof parameter>;

  const searchResult = searchString
    ? await mysqlUtil.search('tb_travel_city', ['city', 'country'], searchString)
    : await mysqlUtil.getMany('tb_travel_city', ['city', 'country'], {});

  const formattedResult =
    searchResult.length === 0
      ? null
      : searchResult.map((result: any) => {
          return { city: result.city, country: result.country, cover: `https://${BucketUrl}/city/${result.city}/cover` };
        });

  return { statusCode: 200, body: JSON.stringify({ result: formattedResult }) };
};
