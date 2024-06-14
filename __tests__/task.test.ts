import { createPublicLambdaEvent, privateFunctionTest } from './testUtil';
import { handler as getTest } from '../src/ts/test/get';
import { handler as postFriend } from '../src/ts/friend/post';
import { handler as getFriendSearch } from '../src/ts/friend/search/get';
import { handler as getFriend } from '../src/ts/friend/get';
import { handler as postTravel } from '../src/ts/travel/post';

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

  test('GET friend', async () => {
    const parameters = {};
    const res = await privateFunctionTest(getFriend, parameters);
    expect(res).toHaveProperty('statusCode', 200);
  });

  test.only('POST travel', async () => {
    const parameters = {
      travelName: 'templestay',
      destination: 'bukhansan',
      startDate: '2024-06-14',
      endDate: '2024-06-22',
      memo: '메모 크크',
    };
    const res = await privateFunctionTest(postTravel, parameters);
    expect(res).toHaveProperty('statusCode', 200);
  });
});
