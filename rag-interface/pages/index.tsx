import { useEffect, useState } from 'react';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const compareProfile = async (jobFilename: string) => {
    setLoading(true);
    setError(null);
    try {
      // Call MCP server or API endpoint
      const response = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_filename: jobFilename }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to compare profile with job');
      }
      
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>Digital Twin - RAG Interface</h1>
      
      <div>
        <h2>Profile vs Job Comparison</h2>
        <button 
          onClick={() => compareProfile('week3-job01-the-star-entertainment-group-data-analyst.md')}
          disabled={loading}
        >
          {loading ? 'Comparing...' : 'Compare with Job 01'}
        </button>
      </div>

      {error && (
        <div style={{ color: 'red', marginTop: '10px' }}>
          Error: {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: '20px', border: '1px solid #ccc', padding: '10px' }}>
          <h3>{result.jobTitle} at {result.company}</h3>
          <p>Overall Score: {result.overallScore}/10 ({result.matchPercentage}% match)</p>
          
          <h4>Matching Skills ({result.matchPoints?.length || 0})</h4>
          <ul>
            {result.matchPoints?.map((skill: any, i: number) => (
              <li key={i}>{skill.skill} ({skill.proficiency})</li>
            ))}
          </ul>

          <h4>Skill Gaps ({result.gapPoints?.length || 0})</h4>
          <ul>
            {result.gapPoints?.map((gap: any, i: number) => (
              <li key={i}>{gap.skill} - {gap.importance}</li>
            ))}
          </ul>

          <p><strong>Recommendation:</strong> {result.recommendation}</p>
        </div>
      )}
    </div>
  );
}
