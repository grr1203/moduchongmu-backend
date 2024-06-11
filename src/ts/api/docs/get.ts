import { APIGatewayProxyEventV2 } from 'aws-lambda';
import fs from 'fs';
import yaml from 'js-yaml';

export const handler = async (event: APIGatewayProxyEventV2) => {
  console.log('[event]', event);

  const currentDir = fs.realpathSync('.');
  const doc = yaml.load(fs.readFileSync(`${currentDir}/apiDocs.yml`, 'utf8'));
  const html = `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <title>Modu-ChongMu API Docs</title>
    <!-- Embed elements Elements via Web Component -->
    <script src="https://unpkg.com/@stoplight/elements/web-components.min.js"></script>
    <link rel="stylesheet" href="https://unpkg.com/@stoplight/elements/styles.min.css">
  </head>
  <body>
    <elements-api id="docs" router="hash" layout="sidebar"></elements-api>
    <script>
    (async () => {
      const docs = document.getElementById('docs');
      const apiDescriptionDocument = ${JSON.stringify(doc)};
    
      docs.apiDescriptionDocument = apiDescriptionDocument;
    })();
    </script>

  </body>
</html>
`;
  console.log('html', html);

  return {
    statusCode: 200,
    body: html,
    headers: {
      'Content-Type': 'text/html',
    },
  };
};
