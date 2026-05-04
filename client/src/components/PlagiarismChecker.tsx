import React, { useState, useRef } from 'react';

interface PlagiarismResult {
  originalityScore: number;
  summary: string;
  suspiciousPassages: string[];
  commonPhrases: string[];
  suggestions: string[];
  rawReport: string;
}

interface PlagiarismCheckerProps {
  onBack: () => void;
}

export const PlagiarismChecker: React.FC<PlagiarismCheckerProps> = ({ onBack }) => {
  const [text, setText] = useState('');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('jerry_openai_key') || '');
  const [result, setResult] = useState<PlagiarismResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const content = await file.text();
    setText(content);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const saveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('jerry_openai_key', key);
  };

  const analyze = async () => {
    if (!text.trim()) { setError('Please paste some text or upload a file first.'); return; }
    if (!apiKey.trim()) { setError('Please enter your OpenAI API key.'); return; }
    setError('');
    setLoading(true);
    setResult(null);

    const prompt = `You are an expert plagiarism detection AI. Carefully analyze the following text and return a JSON response with EXACTLY this structure (no extra text, just valid JSON):

{
  "originalityScore": <number 0-100>,
  "summary": "<2-3 sentence summary of originality assessment>",
  "suspiciousPassages": ["<passage1>", "<passage2>"],
  "commonPhrases": ["<phrase1>", "<phrase2>"],
  "suggestions": ["<suggestion1>", "<suggestion2>"],
  "rawReport": "<detailed multi-paragraph analysis>"
}

Rules:
- originalityScore: 100 = completely original, 0 = entirely plagiarized
- suspiciousPassages: list passages that appear copied or highly generic (max 5)
- commonPhrases: list overused or clichéd phrases (max 5)
- suggestions: actionable improvements (max 5)
- rawReport: a full, readable analysis paragraph

TEXT TO ANALYZE:
---
${text.slice(0, 8000)}
---`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'You are a precise plagiarism detection AI. Always respond with valid JSON only.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.2,
          max_tokens: 1500,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || `API Error ${response.status}`);
      }

      const data = await response.json();
      const rawContent = data.choices?.[0]?.message?.content || '{}';
      
      // Extract JSON from markdown if wrapped in ```json ... ```
      const jsonMatch = rawContent.match(/```json\s*([\s\S]*?)```/) || rawContent.match(/({[\s\S]*})/);
      const jsonString = jsonMatch ? jsonMatch[1] : rawContent;
      
      const parsed: PlagiarismResult = JSON.parse(jsonString.trim());
      setResult(parsed);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Check your API key and try again.');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#22c55e';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Highly Original';
    if (score >= 60) return 'Mostly Original';
    if (score >= 40) return 'Moderately Original';
    return 'Potentially Plagiarized';
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--background-color)',
      padding: '0',
      fontFamily: 'var(--font-family)',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)',
        padding: '20px 32px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.3)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.25)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
        >
          ← Dashboard
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ color: 'white', margin: 0, fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.5px' }}>
            🔍 AI Plagiarism Checker
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', margin: '4px 0 0', fontSize: '14px' }}>
            Upload or paste content to check originality using GPT-4o
          </p>
        </div>
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '8px',
          padding: '6px 14px',
          color: 'rgba(255,255,255,0.8)',
          fontSize: '12px',
          fontWeight: 600,
          letterSpacing: '1px',
          textTransform: 'uppercase',
        }}>
          Powered by GPT-4o
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        
        {/* LEFT COLUMN — Input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* API Key */}
          <div style={{ background: 'var(--surface-color, #f8fafc)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '14px', color: 'var(--text-color)' }}>
              🔑 OpenAI API Key
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="password"
                value={apiKey}
                onChange={e => saveApiKey(e.target.value)}
                placeholder="sk-proj-..."
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--background-color)',
                  color: 'var(--text-color)',
                  fontSize: '14px',
                }}
              />
              <button
                onClick={() => saveApiKey('')}
                title="Clear saved key"
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #fecaca',
                  background: '#fef2f2',
                  color: '#dc2626',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '13px',
                  whiteSpace: 'nowrap',
                }}
              >
                ✕ Clear
              </button>
            </div>
            {apiKey && (
              <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#22c55e', fontWeight: 600 }}>
                ✅ Active key ends in: ...{apiKey.slice(-6)}
              </p>
            )}
            {!apiKey && (
              <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#f59e0b', fontWeight: 600 }}>
                ⚠️ No key saved — paste your OpenAI key above
              </p>
            )}
          </div>

          {/* File Upload */}
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '2px dashed #a78bfa',
              borderRadius: '12px',
              padding: '28px',
              textAlign: 'center',
              cursor: 'pointer',
              background: 'rgba(167, 139, 250, 0.05)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(167, 139, 250, 0.12)';
              e.currentTarget.style.borderColor = '#7c3aed';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(167, 139, 250, 0.05)';
              e.currentTarget.style.borderColor = '#a78bfa';
            }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📁</div>
            <div style={{ fontWeight: 600, color: '#7c3aed', marginBottom: '4px' }}>
              {fileName ? `✅ ${fileName}` : 'Click to upload a file'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted-color, #9ca3af)' }}>
              Supports .txt, .md, .docx, .csv, .js, .py, .html
            </div>
            <input
              ref={fileInputRef}
              type="file"
              style={{ display: 'none' }}
              accept=".txt,.md,.json,.js,.ts,.py,.html,.css,.csv"
              onChange={handleFileUpload}
            />
          </div>

          {/* Text Area */}
          <div style={{
            background: 'var(--surface-color, #f8fafc)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '20px',
            flex: 1,
          }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '14px', color: 'var(--text-color)' }}>
              📝 Or paste your text directly
            </label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Paste the content you want to check for plagiarism here..."
              style={{
                width: '100%',
                minHeight: '260px',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'var(--background-color)',
                color: 'var(--text-color)',
                fontSize: '14px',
                lineHeight: '1.6',
                resize: 'vertical',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted-color, #9ca3af)' }}>
                {text.length.toLocaleString()} characters · {text.split(/\s+/).filter(Boolean).length.toLocaleString()} words
              </span>
              {text && (
                <button
                  onClick={() => { setText(''); setFileName(''); setResult(null); setError(''); }}
                  style={{
                    background: 'none', border: 'none', color: '#ef4444',
                    cursor: 'pointer', fontSize: '12px', padding: '2px 8px',
                  }}
                >
                  ✕ Clear
                </button>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '12px 16px',
              color: '#dc2626',
              fontSize: '14px',
            }}>
              ❌ {error}
            </div>
          )}

          {/* Analyze Button */}
          <button
            onClick={analyze}
            disabled={loading}
            style={{
              background: loading ? '#a78bfa' : 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              padding: '16px 24px',
              fontSize: '16px',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              boxShadow: loading ? 'none' : '0 4px 15px rgba(124,58,237,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {loading ? (
              <>
                <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span>
                Analyzing with GPT-4o...
              </>
            ) : '🔍 Analyze for Plagiarism'}
          </button>
        </div>

        {/* RIGHT COLUMN — Results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {!result && !loading && (
            <div style={{
              background: 'var(--surface-color, #f8fafc)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '60px 40px',
              textAlign: 'center',
              color: 'var(--text-muted-color, #9ca3af)',
            }}>
              <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🛡️</div>
              <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '8px', color: 'var(--text-color)' }}>
                Your Results Will Appear Here
              </div>
              <div style={{ fontSize: '14px' }}>
                Upload a file or paste text, add your API key, and click Analyze to get a detailed plagiarism report.
              </div>
            </div>
          )}

          {loading && (
            <div style={{
              background: 'var(--surface-color, #f8fafc)',
              border: '1px solid #c4b5fd',
              borderRadius: '12px',
              padding: '60px 40px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px', animation: 'pulse 1.5s ease-in-out infinite' }}>🔍</div>
              <div style={{ fontWeight: 600, fontSize: '1.1rem', color: '#7c3aed', marginBottom: '8px' }}>
                Analyzing your document...
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text-muted-color, #9ca3af)' }}>
                GPT-4o is checking for plagiarism, clichés, and originality
              </div>
            </div>
          )}

          {result && (
            <>
              {/* Score Card */}
              <div style={{
                background: `linear-gradient(135deg, ${getScoreColor(result.originalityScore)}22, ${getScoreColor(result.originalityScore)}11)`,
                border: `2px solid ${getScoreColor(result.originalityScore)}44`,
                borderRadius: '12px',
                padding: '24px',
                textAlign: 'center',
              }}>
                <div style={{
                  fontSize: '5rem',
                  fontWeight: 800,
                  color: getScoreColor(result.originalityScore),
                  lineHeight: 1,
                  marginBottom: '8px',
                }}>
                  {result.originalityScore}%
                </div>
                <div style={{ fontWeight: 700, fontSize: '1.2rem', color: getScoreColor(result.originalityScore), marginBottom: '8px' }}>
                  {getScoreLabel(result.originalityScore)}
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-color)', opacity: 0.8, lineHeight: 1.6 }}>
                  {result.summary}
                </div>
              </div>

              {/* Suspicious Passages */}
              {result.suspiciousPassages?.length > 0 && (
                <div style={{ background: 'var(--surface-color, #f8fafc)', border: '1px solid #fecaca', borderRadius: '12px', padding: '20px' }}>
                  <h3 style={{ margin: '0 0 12px', fontSize: '15px', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    ⚠️ Suspicious Passages
                  </h3>
                  {result.suspiciousPassages.map((p, i) => (
                    <div key={i} style={{
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: '6px',
                      padding: '10px 12px',
                      marginBottom: '8px',
                      fontSize: '13px',
                      color: '#7f1d1d',
                      fontStyle: 'italic',
                    }}>
                      "{p}"
                    </div>
                  ))}
                </div>
              )}

              {/* Common Phrases */}
              {result.commonPhrases?.length > 0 && (
                <div style={{ background: 'var(--surface-color, #f8fafc)', border: '1px solid #fde68a', borderRadius: '12px', padding: '20px' }}>
                  <h3 style={{ margin: '0 0 12px', fontSize: '15px', color: '#b45309', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    💬 Common / Clichéd Phrases
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {result.commonPhrases.map((p, i) => (
                      <span key={i} style={{
                        background: '#fffbeb',
                        border: '1px solid #fcd34d',
                        borderRadius: '20px',
                        padding: '4px 12px',
                        fontSize: '13px',
                        color: '#92400e',
                      }}>
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {result.suggestions?.length > 0 && (
                <div style={{ background: 'var(--surface-color, #f8fafc)', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '20px' }}>
                  <h3 style={{ margin: '0 0 12px', fontSize: '15px', color: '#15803d', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    💡 Suggestions to Improve Originality
                  </h3>
                  {result.suggestions.map((s, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      gap: '10px',
                      marginBottom: '8px',
                      fontSize: '13px',
                      color: 'var(--text-color)',
                      lineHeight: 1.5,
                    }}>
                      <span style={{ color: '#22c55e', fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                      {s}
                    </div>
                  ))}
                </div>
              )}

              {/* Full Report */}
              <div style={{ background: 'var(--surface-color, #f8fafc)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
                <h3 style={{ margin: '0 0 12px', fontSize: '15px', color: 'var(--text-color)' }}>📄 Full Report</h3>
                <div style={{ fontSize: '13px', lineHeight: '1.7', color: 'var(--text-color)', whiteSpace: 'pre-wrap', opacity: 0.85 }}>
                  {result.rawReport}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  );
};
