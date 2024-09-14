import { NextApiRequest, NextApiResponse } from 'next';
import ModelClient from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = process.env.GITHUB_TOKEN;
  const endpoint = process.env.AZURE_ENDPOINT;
  const modelName = process.env.MODEL_NAME;

  if (!token || !endpoint || !modelName) {
    return res.status(500).json({ error: 'Missing environment variables' });
  }

  const client = ModelClient(endpoint, new AzureKeyCredential(token));

  try {
    const response = await client.path("/chat/completions").post({
      body: {
        messages: req.body.messages,
        model: modelName,
        temperature: 1.0,
        max_tokens: 1000,
        top_p: 1.0
      }
    });

    if (response.status !== "200") {
      throw response.body;
    }

    if ('choices' in response.body) {
      res.status(200).json(response.body.choices[0].message.content);
    } else {
      res.status(500).json({ error: 'Unexpected response format' });
    }
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while processing your request' });
  }
}