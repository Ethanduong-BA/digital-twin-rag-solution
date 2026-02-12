import type { NextApiRequest, NextApiResponse } from 'next';

type ResponseData = {
  success?: boolean;
  data?: any;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { job_filename } = req.body;

    if (!job_filename) {
      return res.status(400).json({ error: 'job_filename is required' });
    }

    // TODO: Connect to MCP server here
    // For now, return a mock response
    const mockResult = {
      jobTitle: 'Data Analyst',
      company: 'Test Company',
      matchPoints: [
        { skill: 'Power BI', proficiency: 'intermediate' },
        { skill: 'Data Analysis', proficiency: 'expert' },
      ],
      gapPoints: [
        { skill: 'SQL', importance: 'critical' },
        { skill: 'Python', importance: 'important' },
      ],
      matchPercentage: 40,
      overallScore: 6,
      recommendation: 'You have some relevant skills. Consider developing SQL expertise.',
    };

    res.status(200).json({ success: true, data: mockResult });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
}
