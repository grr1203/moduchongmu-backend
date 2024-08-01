import { APIGatewayProxyEventV2WithLambdaAuthorizer } from 'aws-lambda';
import mysqlUtil from '../lib/mysqlUtil';
import { FromSchema } from 'json-schema-to-ts';
import { formatTransaction } from '../lib/transaction';
import { nanoid } from 'nanoid';

const parameter = {
  type: 'object',
  properties: {
    travelUid: { type: 'string' },
    executorList: { type: 'array' }, // travel member idx list
    targetList: { type: 'array' }, // travel member idx list
    category: { type: 'string' },
    content: { type: 'string' },
    type: { type: 'string' }, // expense, income, transfer
    amount: { type: 'number' },
    currency: { type: 'string' }, // ex) KRW(₩)
    paymentMethod: { type: 'string' }, // card, teamCash, personalCash
    expenseSplit: { type: 'object' }, // 1. { hyo : 10000, ju : 20000 } 2. { hyo : 0.5, ju : 0.5 }
    createdDate: { type: 'string' }, // YYYY-MM-DDThh:mm:ss+TZ
  },
  required: [
    'travelUid',
    'executorList',
    'targetList',
    'category',
    'content',
    'type',
    'amount',
    'currency',
    'paymentMethod',
    'createdDate',
  ],
} as const;

export const handler = async (event: APIGatewayProxyEventV2WithLambdaAuthorizer<{ [key: string]: any }>) => {
  console.log('[event]', event);
  const {
    travelUid,
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

  const travel = await mysqlUtil.getOne('tb_travel', [], { uid: travelUid });
  const travelIdx = travel.idx;
  const travelMemberList = (await mysqlUtil.getMany('tb_travel_member', ['userIdx'], { travelIdx })).map(
    (member) => member.userIdx
  );

  // 트랜잭션 생성
  const transactionUid = nanoid(10);
  const transactionData = {
    travelIdx,
    uid: transactionUid,
    userIdx,
    executorList: executorList.join(','),
    targetList: targetList.join(','),
    category,
    content,
    type,
    amount,
    currency,
    paymentMethod,
    expenseSplit,
    createdDate,
  };
  await mysqlUtil.create('tb_transaction', transactionData);
  const transaction = await formatTransaction(travelMemberList as any, transactionData as any);

  return { statusCode: 200, body: JSON.stringify({ transaction }) };
};
