import { createPublicLambdaEvent, privateFunctionTest } from './testUtil';
import { handler as getTest } from '../src/ts/test/get';
import { handler as postFriend } from '../src/ts/friend/post';

describe('ModuChongmu test', () => {
  test('GET test', async () => {
    const parameters = { name: 's', age: 12 };
    const res = await getTest(createPublicLambdaEvent(parameters));
    console.log('res', res);
    expect(res).toHaveProperty('statusCode', 200);
  });

  test('POST friend', async () => {
    const parameters = { newFriendName: 'hyofriend' };
    const res = await privateFunctionTest(postFriend, parameters);
    expect(res).toHaveProperty('statusCode', 200);
  });
});
