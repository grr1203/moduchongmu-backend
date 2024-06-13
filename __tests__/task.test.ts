import { createPublicLambdaEvent, privateFunctionTest } from './testUtil';
import { handler as getTest } from '../src/ts/test/get';
import { handler as postFriend } from '../src/ts/friend/post';
import { handler as getFriendSearch } from '../src/ts/friend/search/get';
import { handler as getFriend } from '../src/ts/friend/get';

describe('ModuChongmu test', () => {
  test('GET test', async () => {
    const parameters = { name: 's', age: 12 };
    const res = await getTest(createPublicLambdaEvent(parameters));
    console.log('res', res);
    expect(res).toHaveProperty('statusCode', 200);
  });

  test('GET friend/search', async () => {
    const parameters = { searchString: 'hyo' };
    const res = await privateFunctionTest(getFriendSearch, parameters);
    expect(res).toHaveProperty('statusCode', 200);
  });

  test('POST friend', async () => {
    const parameters = { newFriendName: 'hyofriend' };
    const res = await privateFunctionTest(postFriend, parameters);
    expect(res).toHaveProperty('statusCode', 200);
  });

  test.only('GET friend', async () => {
    const parameters = {};
    const res = await privateFunctionTest(getFriend, parameters);
    expect(res).toHaveProperty('statusCode', 200);
  });
});
