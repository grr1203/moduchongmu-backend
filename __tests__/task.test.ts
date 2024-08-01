import { createPublicLambdaEvent, privateFunctionTest } from './testUtil';
import { handler as getTest } from '../src/ts/test/get';
import { handler as postTravel } from '../src/ts/travel/post';
import { handler as getTravel } from '../src/ts/travel/get';
import { handler as getTravelCurrent } from '../src/ts/travel/current/get';
import { handler as putTravel } from '../src/ts/travel/put';
import { handler as getTravelList } from '../src/ts/travel/list/get';
import { handler as getTransactionCurrency } from '../src/ts/transaction/currency/get';
import { handler as postTransaction } from '../src/ts/transaction/post';
import { handler as getTransactionList } from '../src/ts/transaction/list/get';

describe('ModuChongmu test', () => {
  test('GET test', async () => {
    const parameters = { name: 's', age: 12 };
    const res = await getTest(createPublicLambdaEvent(parameters));
    console.log('res', res);
    expect(res).toHaveProperty('statusCode', 200);
  });

  // Travel
  test('POST travel', async () => {
    const parameters = {
      travelName: 'templestay',
      country: 'korea',
      city: 'seoul',
      startDate: '2024-06-14',
      endDate: '2024-06-22',
      memo: '메모 크크',
    };
    const res = await privateFunctionTest(postTravel, parameters);
    expect(res).toHaveProperty('statusCode', 200);
  });

  test('GET travel', async () => {
    const parameters = { uid: 'abcdzz' };
    const res = await privateFunctionTest(getTravel, parameters);
    expect(res).toHaveProperty('statusCode', 200);
  });

  test('GET travel/current', async () => {
    const res = await privateFunctionTest(getTravelCurrent, {});
    expect(res).toHaveProperty('statusCode', 200);
  });

  test('PUT travel', async () => {
    const parameters = {
      uid: 'abcdzz',
      startDate: '2024-06-13',
      endDate: '2024-06-18',
      settlementDone: true,
      memberArray: ['hyo'],
      coverImage: true,
    };
    const res = await privateFunctionTest(putTravel, parameters);
    expect(res).toHaveProperty('statusCode', 200);
  });

  test('GET travel/list', async () => {
    const parameters = { pageSize: 10, page: 1 };
    const res = await privateFunctionTest(getTravelList, parameters);
    expect(res).toHaveProperty('statusCode', 200);
  });

  // Transaction
  test('GET transaction/currency', async () => {
    const parameters = { country: null };
    const res = await privateFunctionTest(getTransactionCurrency, parameters);
    expect(res).toHaveProperty('statusCode', 200);
  });

  test('POST transaction', async () => {
    const parameters = {
      travelUid: 'abcdzz',
      executorList: [1],
      targetList: [1, 5],
      category: 'food',
      content: '커피',
      type: 'expense',
      amount: 1100,
      currency: 'JPY(¥)',
      paymentMethod: 'card',
      // expenseSplit: { 1: 1000 },
      createdDate: '2024-07-19T16:00:00+09:00',
    };
    const res = await privateFunctionTest(postTransaction, parameters);
    expect(res).toHaveProperty('statusCode', 200);
  });

  test.only('GET transaction/list', async () => {
    const parameters = { travelUid: 'abcdzz', pageSize: 10, page: 1 };
    const res = await privateFunctionTest(getTransactionList, parameters);
    expect(res).toHaveProperty('statusCode', 200);
  });
});
