export function formatTransaction(
  travelMemberList: [{ idx: number; memberName: string }],
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
  const transaction = {
    uid: tansactionObject.uid,
    creator: travelMemberList.find((member) => member.idx === tansactionObject.userIdx)?.memberName,
    executorList: tansactionObject.executorList.split(',').map((idx) => {
      return travelMemberList.find((member) => member.idx === Number(idx))?.memberName;
    }),
    targetList: tansactionObject.targetList.split(',').map((idx) => {
      return travelMemberList.find((member) => member.idx === Number(idx))?.memberName;
    }),
    category: tansactionObject.category,
    content: tansactionObject.content,
    type: tansactionObject.type,
    amount: tansactionObject.amount,
    currency: tansactionObject.currency,
    paymentMethod: tansactionObject.paymentMethod,
    expenseSplit: transformExpenseSplitObject(tansactionObject.expenseSplit, travelMemberList),
    createDate: tansactionObject.createdDate,
  };
  return transaction;
}

function transformExpenseSplitObject(expenseSplit, travelMemberList) {
  const newExpenseSplit = {};
  for (const key in expenseSplit) {
    if (expenseSplit.hasOwnProperty(key)) {
      const member = travelMemberList.find((item) => item.idx === parseInt(key));
      if (member) {
        newExpenseSplit[member.memberName] = expenseSplit[key];
      }
    }
  }
  return Object.keys(newExpenseSplit).length !== 0 ? newExpenseSplit : null;
}
