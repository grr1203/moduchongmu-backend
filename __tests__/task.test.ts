import { handler as getTest } from '../src/ts/test/get';
import { createPublicLambdaEvent } from './testUtil';

describe('ModuChongmu test', () => {
  test('GET test', async () => {
    const parameters = { name: 's', age: 12 };
    const res = await getTest(createPublicLambdaEvent(parameters));
    console.log('res', res);
    expect(res).toHaveProperty('statusCode', 200);
  });
});
