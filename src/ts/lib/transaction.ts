import mysqlUtil from './mysqlUtil';

export async function formatTransaction(
  travelMemberList: number[], // user idx list
  tansactionObject: {
    idx: number;
    uid: string;
    travelIdx: number;
    userIdx: number;
    executorList: string;
    targetList: string;
    category: string;
    content: string;
    type: string;
    amount: number;
    currency: string;
    paymentMethod: string;
    expenseSplit?: object;
    createdDate: string;
  }
) {
  const recordBy = (await mysqlUtil.getOne('tb_user', ['userName'], { idx: tansactionObject.userIdx })).userName;
  const executorList = (await mysqlUtil.getMany('tb_user', ['userName'], { idx: tansactionObject.executorList })).map(
    (user) => user.userName
  );
  const targetList = (await mysqlUtil.getMany('tb_user', ['userName'], { idx: tansactionObject.targetList })).map(
    (user) => user.userName
  );

  const transaction = {
    uid: tansactionObject.uid,
    recordBy,
    executorList,
    targetList,
    category: tansactionObject.category,
    content: tansactionObject.content,
    type: tansactionObject.type,
    amount: tansactionObject.amount,
    currency: tansactionObject.currency,
    paymentMethod: tansactionObject.paymentMethod,
    expenseSplit: await transformExpenseSplitObject(tansactionObject.expenseSplit, travelMemberList),
    createDate: tansactionObject.createdDate,
  };
  return transaction;
}

async function transformExpenseSplitObject(expenseSplit, travelMemberList) {
  const newExpenseSplit = {};
  for (const key in expenseSplit) {
    if (expenseSplit.hasOwnProperty(key)) {
      const memberIdx = travelMemberList.find((idx) => idx === parseInt(key));
      if (memberIdx) {
        const member = await mysqlUtil.getOne('tb_user', ['userName'], { idx: memberIdx });
        newExpenseSplit[member.userName] = expenseSplit[key];
      }
    }
  }
  return Object.keys(newExpenseSplit).length !== 0 ? newExpenseSplit : null;
}
