import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { verifyJwtKey } from '../lib/jwt.js';

export const handler = async (event: APIGatewayProxyEventV2): Promise<{ isAuthorized: boolean; context: any }> => {
  let response = { isAuthorized: false, context: {} };
  const tokenFromRequest = event.headers.authorization?.split(' ')[1];
  console.log('[Authorizer: tokenFromRequest]', tokenFromRequest);
  const verifyJwt = verifyJwtKey(tokenFromRequest ?? '');
  response.isAuthorized = verifyJwt.verified;

  if (verifyJwt.verified === true) {
    response.context = { ...verifyJwt.decoded };
  } else {
    console.log('[Authorizer: Verification Failed]');
    response.context = { err: verifyJwt.err };
  }

  return response;
};
