import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { FromSchema } from 'json-schema-to-ts';

const parameter = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    age: { type: 'integer' },
  },
  required: ['name'],
} as const;

export const handler = async (event: APIGatewayProxyEventV2) => {
  console.log('[event]', event);
  const parameters = event.queryStringParameters as FromSchema<typeof parameter>;
  console.log('[parameters]', parameters);

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: `Hello ${parameters.name}, welcome to the exciting Serverless world!`,
      event,
    }),
  };
};
