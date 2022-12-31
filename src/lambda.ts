import { APIGatewayProxyHandlerV2 } from 'aws-lambda';

import run from './run';

/**
 * This isn't strictly an API Gateway handler (instead Function URL is used)
 * but this is the closest
 */
export const lambdaHandler: APIGatewayProxyHandlerV2 = async (event) => {
  if (event.body == null) {
    throw new Error('invalid payload');
  }
  const body = JSON.parse(event.body);
  await run(body);

  return {
    statusCode: 200,
  };
};
