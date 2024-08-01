import { APIGatewayProxyEventV2WithLambdaAuthorizer } from 'aws-lambda';
import mysqlUtil from '../lib/mysqlUtil';
import { FromSchema } from 'json-schema-to-ts';
import { formatTransaction } from '../lib/transaction';
import { checkTravelMember } from '../lib/travel';

const parameter = {
  type: 'object',
  properties: {
    uid: { type: 'string' },
    executorList: { type: 'array' },
    targetList: { type: 'array' },
    category: { type: 'string' },
    content: { type: 'string' },
    type: { type: 'string' },
    amount: { type: 'number' },
    currency: { type: 'string' },
    paymentMethod: { type: 'string' },
    expenseSplit: { type: 'object' },
    createdDate: { type: 'string' },
  },
  required: ['uid'],
} as const;

export const handler = async (event: APIGatewayProxyEventV2WithLambdaAuthorizer<{ [key: string]: any }>) => {
  console.log('[event]', event);
  const {
    uid,
    executorList,
    targetList,
    category,
    content,
    type,
    amount,
    currency,
    paymentMethod,
    expenseSplit,
    createdDate,
  } = JSON.parse(event.body) as FromSchema<typeof parameter>;
  const userIdx = event.requestContext.authorizer.lambda.idx;

  // 자기가 포함된 여행방인지 체크
  const { isMember } = await checkTravelMember(uid, userIdx);
  if (!isMember) return { statusCode: 403, body: JSON.stringify({ code: 'NOT_MEMBER' }) };

  const updateObject: { [key: string]: any } = {};
  executorList && (updateObject.executorList = executorList);
  targetList && (updateObject.targetList = targetList);
  category && (updateObject.category = category);
  content && (updateObject.content = content);
  type && (updateObject.type = type);
  amount && (updateObject.amount = amount);
  currency && (updateObject.currency = currency);
  paymentMethod && (updateObject.paymentMethod = paymentMethod);
  expenseSplit && (updateObject.expenseSplit = expenseSplit);
  createdDate && (updateObject.createdDate = createdDate);

  await mysqlUtil.update('tb_transaction', { userIdx }, { uid });

  const transactionData = await mysqlUtil.getOne('tb_transaction', [], { uid });
  const travelMemberList = await mysqlUtil.getMany('tb_travel_member', ['userIdx'], {
    travelIdx: transactionData.travelIdx,
  });
  const transaction = await formatTransaction(travelMemberList as any, transactionData as any);

  return { statusCode: 200, body: JSON.stringify({ transaction }) };
};
