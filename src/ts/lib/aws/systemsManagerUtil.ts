import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
const client = new SSMClient({ region: 'ap-northeast-2' });

export const getSsmParameter = async (parameterName: string) => {
  console.log('[systems manager parameterName]', parameterName);
  const command = new GetParameterCommand({ Name: parameterName });
  const response = await client.send(command);
  return response.Parameter?.Value;
};
