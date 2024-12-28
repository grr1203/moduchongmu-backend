import mysqlUtil from './mysqlUtil';

export async function formatTransaction(
  travelMemberList: number[], // user idx list
  transactionObject: {
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
    usedDate: string;
    createdDate?: string;
  }
) {
  const recordBy = (await mysqlUtil.getOne('tb_user', ['userName'], { idx: transactionObject.userIdx })).userName;
  const executorList = (await mysqlUtil.getMany('tb_user', ['userName'], { idx: transactionObject.executorList })).map(
    (user) => user.userName
  );
  const targetList = (await mysqlUtil.getMany('tb_user', ['userName'], { idx: transactionObject.targetList })).map(
    (user) => user.userName
  );

  const transaction = {
    uid: transactionObject.uid,
    recordBy,
    executorList,
    targetList,
    category: transactionObject.category,
    content: transactionObject.content,
    type: transactionObject.type,
    amount: transactionObject.amount,
    currency: transactionObject.currency,
    paymentMethod: transactionObject.paymentMethod,
    expenseSplit: await transformExpenseSplitObject(transactionObject.expenseSplit, travelMemberList),
    usedDate: transactionObject.usedDate,
    createDate: transactionObject.createdDate,
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
