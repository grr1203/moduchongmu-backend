export function formatTransaction(
  travelMemberList: [{ idx: number; memberName: string }],
  tansactionObject: {
    idx: number;
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
    expenseSplit: tansactionObject.expenseSplit,
    createDate: tansactionObject.createdDate,
  };
  return transaction;
}
