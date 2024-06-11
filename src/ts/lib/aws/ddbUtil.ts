import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocument,
  PutCommandInput,
  GetCommandInput,
  QueryCommandInput,
  DeleteCommandInput,
  UpdateCommandInput,
} from '@aws-sdk/lib-dynamodb';

const ddbDocClient = DynamoDBDocument.from(new DynamoDBClient({ region: 'ap-northeast-2' }));

export const ddbPut = async (params: PutCommandInput) => {
  try {
    console.log('ddbPut Parameters', params);
    const res = await ddbDocClient.put(params);
    console.log('Item put(added) successfully: ', res);
  } catch (error) {
    console.error('Error putting(adding) item to DynamoDB:', error);
  }
};

export const ddbGet = async (params: GetCommandInput) => {
  try {
    console.log('ddbGet Parameters', params);
    const res = await ddbDocClient.get(params);
    console.log('Item get successfully: ', res);
    return res.Item;
  } catch (error) {
    console.error('Error getting item to DynamoDB:', error);
  }
};

export const ddbGetWithTTL = async (params: QueryCommandInput) => {
  try {
    params.FilterExpression = params.FilterExpression ? `${params.FilterExpression} AND #ttl > :ttl` : '#ttl > :ttl';
    params.ExpressionAttributeNames = { ...params.ExpressionAttributeNames, '#ttl': 'ttl' }; // ttl is ddb reserved keyword
    params.ExpressionAttributeValues = { ...params.ExpressionAttributeValues, ':ttl': Math.floor(Date.now() / 1000) };
    console.log('ddbGetWithTTL Parameters', params);
    const data = await ddbDocClient.query(params);
    console.log('Item get with ttl successfully: ', data);
    return data.Items ?? [];
  } catch (error) {
    console.error('Error getting item with ttl to DynamoDB:', error);
    return [];
  }
};

export const ddbDelete = async (params: DeleteCommandInput) => {
  try {
    console.log('ddbDelete Parameters', params);
    await ddbDocClient.delete({ ...params, ReturnValues: 'ALL_OLD' });
    console.log('Item deleted successfully');
  } catch (error) {
    console.error('Error deleting item to DynamoDB:', error);
  }
};

export const ddbUpdate = async (TableName: string, Key: { [key: string]: any }, AttributeName: string, value: any) => {
  const params: UpdateCommandInput = {
    TableName,
    Key,
    UpdateExpression: `set #columnName = :value`,
    ExpressionAttributeNames: { '#columnName': AttributeName },
    ExpressionAttributeValues: { ':value': value },
    ReturnValues: 'ALL_NEW',
  };
  try {
    const data = await ddbDocClient.update(params);
    console.log('Item update successfully:', data);
    return data;
  } catch (error) {
    console.error('Error updating item to DynamoDB:', error);
  }
};

export const ddbQuery = async (params: QueryCommandInput) => {
  try {
    const data = await ddbDocClient.query(params);
    console.log('ddb query successfully:', data);
    return data.Items;
  } catch (error) {
    console.error('Error query of DynamoDB:', error);
  }
};
