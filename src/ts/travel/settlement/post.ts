import { APIGatewayProxyEventV2WithLambdaAuthorizer } from 'aws-lambda';
import mysqlUtil from '../../lib/mysqlUtil';
import { FromSchema } from 'json-schema-to-ts';

const parameter = {
  type: 'object',
  properties: {
    travelUid: { type: 'string' },
  },
  required: ['travelUid'],
} as const;

export const handler = async (event: APIGatewayProxyEventV2WithLambdaAuthorizer<{ [key: string]: any }>) => {
  console.log('[event]', event);
  const { travelUid } = JSON.parse(event.body) as FromSchema<typeof parameter>;

  const travel = await mysqlUtil.getOne('tb_travel', [], { uid: travelUid });
  const travelMemberIdxList = (await mysqlUtil.getMany('tb_travel_member', ['userIdx'], { travelIdx: travel.idx })).map(
    (member) => member.userIdx
  );
  const transactionList = await mysqlUtil.getMany('tb_transaction', [], { travelIdx: travel.idx });

  // 1. 멤버별 지출 금액 & 사용 금액 각각 총합 계산
  const totalByMember = travelMemberIdxList.reduce((newObject, idx) => {
    newObject[idx] = { expense: 0, usage: 0, total: 0 };
    return newObject;
  }, {});
  // 지출 & 사용 계산
  for (const transaction of transactionList) {
    // 현재 transaction type : expense로 고정
    console.log('transaction', transaction);

    const executorList = transaction.executorList.split(',');
    const targetList = transaction.targetList.split(',');
    const transactionCurrency = transaction.currency.split('(')[0];
    if (travel.currency.split('(')[0] === transactionCurrency) {
      // 여행 방 통화로 사용한 경우
      executorList.forEach((userIdx) => {
        totalByMember[userIdx].expense += transaction.amount / executorList.length;
      });
      targetList.forEach((userIdx) => {
        totalByMember[userIdx].usage += transaction.amount / targetList.length;
      });
    } else {
      // 통화 다른 경우 새로운 key-value pair 생성
      executorList.forEach((userIdx) => {
        totalByMember[userIdx][transactionCurrency] ??
          (totalByMember[userIdx][transactionCurrency] = { expense: 0, usage: 0, total: 0 });
        totalByMember[userIdx][transactionCurrency].expense += transaction.amount / executorList.length;
      });
      targetList.forEach((userIdx) => {
        totalByMember[userIdx][transactionCurrency] ??
          (totalByMember[userIdx][transactionCurrency] = { expense: 0, usage: 0, total: 0 });
        totalByMember[userIdx][transactionCurrency].usage += transaction.amount / targetList.length;
      });
    }
  }

  // 2. 반올림 & 총합 계산 -> 송금 할지 / 받을지 결정
  const senderList = [];
  const receiverList = [];
  const sameList = [];
  const senderListCurrency = {};
  const receiverListCurrency = {};
  const sameListCurrency = {};
  Object.keys(totalByMember).forEach((userIdx) => {
    // 메인 통화 소비 내역 총합
    totalByMember[userIdx].expense = Math.round(totalByMember[userIdx].expense * Math.pow(10, 3)) / Math.pow(10, 3);
    totalByMember[userIdx].usage = Math.round(totalByMember[userIdx].usage * Math.pow(10, 3)) / Math.pow(10, 3);
    totalByMember[userIdx].total =
      Math.round((totalByMember[userIdx].expense - totalByMember[userIdx].usage) * Math.pow(10, 3)) / Math.pow(10, 3);
    if (totalByMember[userIdx].total === 0) sameList.push(userIdx);
    else {
      totalByMember[userIdx].total < 0 ? senderList.push(userIdx) : receiverList.push(userIdx);
    }

    // 다른 통화 소비 내역 있는 경우
    const excludeKeys = ['expense', 'usage', 'total'];
    const currencyKeys = Object.keys(totalByMember[userIdx]).filter((key) => !excludeKeys.includes(key));
    if (currencyKeys) {
      currencyKeys.forEach((currency) => {
        totalByMember[userIdx][currency].expense =
          Math.round(totalByMember[userIdx][currency].expense * Math.pow(10, 3)) / Math.pow(10, 3);
        totalByMember[userIdx][currency].usage =
          Math.round(totalByMember[userIdx][currency].usage * Math.pow(10, 3)) / Math.pow(10, 3);
        totalByMember[userIdx][currency].total =
          Math.round(
            (totalByMember[userIdx][currency].expense - totalByMember[userIdx][currency].usage) * Math.pow(10, 3)
          ) / Math.pow(10, 3);

        senderListCurrency[currency] ?? (senderListCurrency[currency] = []);
        receiverListCurrency[currency] ?? (receiverListCurrency[currency] = []);
        sameListCurrency[currency] ?? (sameListCurrency[currency] = []);
        if (totalByMember[userIdx][currency].total === 0) {
          sameListCurrency[currency].push(userIdx);
        } else {
          totalByMember[userIdx][currency].total < 0
            ? senderListCurrency[currency].push(userIdx)
            : receiverListCurrency[currency].push(userIdx);
        }
      });
    }
  });
  console.log('totalByMember after sum', totalByMember);
  console.log('senderList, receiverList, sameList', senderList, receiverList, sameList);
  console.log('Currency senderList,receiverList,sameList', senderListCurrency, receiverListCurrency, sameListCurrency);

  // 3. 송금 리스트 생성
  const settlementList = [];
  const processSettlement = (sender, receiver, amount, currency?) => {
    const settlement = {
      sender,
      receiver,
      amount: Math.abs(amount),
      currency: currency || travel.currency.split('(')[0],
    };
    if (currency) {
      otherCurrencySettlementList[currency] ??= [];
      otherCurrencySettlementList[currency].push(settlement);
    } else {
      settlementList.push(settlement);
    }
  };

  // 메인 통화
  const targetLength = senderList.length + receiverList.length;
  let sender = senderList.shift();
  let receiver = receiverList.shift();
  for (let i = 0; i < targetLength; i++) {
    const senderTotal = totalByMember[sender].total;
    const receiverTotal = totalByMember[receiver].total;

    if (senderTotal === receiverTotal) {
      processSettlement(sender, receiver, senderTotal);
      totalByMember[sender].total = totalByMember[receiver].total = 0;
      sender = senderList.shift();
      receiver = receiverList.shift();
    } else if (receiverTotal > senderTotal) {
      processSettlement(sender, receiver, senderTotal);
      totalByMember[receiver].total -= senderTotal;
      totalByMember[sender].total = 0;
      sender = senderList.shift();
    } else {
      processSettlement(sender, receiver, receiverTotal);
      totalByMember[sender].total -= receiverTotal;
      totalByMember[receiver].total = 0;
      receiver = receiverList.shift();
    }
    if (!sender || !receiver) break;
  }
  console.log('settlementList', settlementList);

  // 다른 통화
  const otherCurrencySettlementList = {};
  const currencyKeyList = Object.keys(senderListCurrency);
  for (const currency of currencyKeyList) {
    const targetLength = senderListCurrency[currency].length + receiverListCurrency[currency].length;
    let senderCurrency = senderListCurrency[currency].shift();
    let receiverCurrency = receiverListCurrency[currency].shift();
    for (let i = 0; i < targetLength; i++) {
      const senderTotal = totalByMember[senderCurrency][currency].total;
      const receiverTotal = totalByMember[receiverCurrency][currency].total;
      if (senderTotal === receiverTotal) {
        processSettlement(senderCurrency, receiverCurrency, senderTotal, currency);
        totalByMember[senderCurrency][currency].total = totalByMember[receiverCurrency][currency].total = 0;
        senderCurrency = senderListCurrency[currency].shift();
        receiverCurrency = receiverListCurrency[currency].shift();
      } else if (receiverTotal > senderTotal) {
        processSettlement(senderCurrency, receiverCurrency, senderTotal, currency);
        totalByMember[receiverCurrency][currency].total -= senderTotal;
        totalByMember[senderCurrency][currency].total = 0;
        senderCurrency = senderListCurrency[currency].shift();
      } else {
        processSettlement(senderCurrency, receiverCurrency, receiverTotal, currency);
        totalByMember[senderCurrency][currency].total -= receiverTotal;
        totalByMember[receiverCurrency][currency].total = 0;
        receiverCurrency = receiverListCurrency[currency].shift();
      }
      if (!senderCurrency || !receiverCurrency) break;
    }
  }
  console.log('otherCurrencySettlementList', otherCurrencySettlementList);

  // 4. 개인 내역서 & 전체 내역서 생성 (todo)

  // 5. pdf 생성 (todo)

  return { statusCode: 200, body: JSON.stringify({ settlementList, otherCurrencySettlementList }) };
};
