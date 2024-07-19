import { APIGatewayProxyEventV2WithLambdaAuthorizer } from 'aws-lambda';
import { FromSchema } from 'json-schema-to-ts';
import mysqlUtil from '../../lib/mysqlUtil';
import { formatTransaction } from '../../lib/transaction';

const parameter = {
  type: 'object',
  properties: {
    travelUid: { type: 'string' },
    pageSize: { type: 'number' },
    page: { type: 'number' },
  },
  required: ['travelUid', 'pageSize', 'page'],
} as const;

export const handler = async (event: APIGatewayProxyEventV2WithLambdaAuthorizer<{ [key: string]: any }>) => {
  console.log('[event]', event);
  const { travelUid, pageSize, page } = event.queryStringParameters as FromSchema<typeof parameter>;

  const travel = await mysqlUtil.getOne('tb_travel', [], { uid: travelUid });

  // pagenation
  const totalCount = await mysqlUtil.getCount('tb_transaction', { travelIdx: travel.idx });
  const startIndex = (page - 1) * pageSize;
  let endIndex = startIndex + pageSize;
  if (totalCount < startIndex + 1) return { statusCode: 200, body: JSON.stringify({ travelList: [], totalCount }) };
  if (totalCount < endIndex) endIndex = totalCount;

  const transactionArray = await mysqlUtil.getMany('tb_transaction', [], { travelIdx: travel.idx });
  const travelMemberList = await mysqlUtil.getMany('tb_travel_member', ['idx', 'memberName'], {
    travelIdx: travel.idx,
  });
  const transactionList = transactionArray.map((transaction) =>
    formatTransaction(travelMemberList as any, transaction as any)
  );

  return { statusCode: 200, body: JSON.stringify({ transactionList, totalCount }) };
};
