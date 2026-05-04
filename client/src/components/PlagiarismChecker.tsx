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

const PROVIDERS = {
  groq: {
    label: 'Groq (FREE)',
    badge: '🆓 Free',
    badgeColor: '#22c55e',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.1-8b-instant',
    placeholder: 'gsk_...',
    signupUrl: 'https://console.groq.com/keys',
    signupLabel: 'Get free key at console.groq.com →',
  },
  openai: {
    label: 'OpenAI (Paid)',
    badge: '💳 Paid',
    badgeColor: '#f59e0b',
    url: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-3.5-turbo',
    placeholder: 'sk-proj-...',
    signupUrl: 'https://platform.openai.com/settings/billing',
    signupLabel: 'Add billing at platform.openai.com →',
  },
};

type ProviderKey = keyof typeof PROVIDERS;

export const PlagiarismChecker: React.FC<PlagiarismCheckerProps> = ({ onBack }) => {
  const [provider, setProvider] = useState<ProviderKey>(
    () => (localStorage.getItem('jerry_plag_provider') as ProviderKey) || 'groq'
  );
  const [apiKey, setApiKey] = useState(
    () => localStorage.getItem(`jerry_plag_key_${localStorage.getItem('jerry_plag_provider') || 'groq'}`) || ''
  );
  const [text, setText] = useState('');
  const [result, setResult] = useState<PlagiarismResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const prov = PROVIDERS[provider];

  const switchProvider = (p: ProviderKey) => {
    setProvider(p);
    localStorage.setItem('jerry_plag_provider', p);
    setApiKey(localStorage.getItem(`jerry_plag_key_${p}`) || '');
    setError('');
  };

  const saveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem(`jerry_plag_key_${provider}`, key);
  };

  const extractPdfText = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if ((window as any).pdfjsLib) {
        processPdf(file, resolve, reject);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => processPdf(file, resolve, reject);
      script.onerror = () => reject(new Error('Failed to load PDF.js'));
      document.head.appendChild(script);
    });
  };

  const processPdf = async (file: File, resolve: (v: string) => void, reject: (e: Error) => void) => {
    try {
      const pdfjsLib = (window as any).pdfjsLib;
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let extractedText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        extractedText += content.items.map((item: any) => item.str).join(' ') + '\n';
      }
      resolve(extractedText);
    } catch (e: any) {
      reject(e);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    
    if (file.name.toLowerCase().endsWith('.pdf')) {
      setLoading(true);
      setError('');
      try {
        const text = await extractPdfText(file);
        setText(text);
      } catch (err: any) {
        setError('Failed to extract text from PDF: ' + err.message);
      } finally {
        setLoading(false);
      }
    } else {
      setText(await file.text());
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const analyze = async () => {
    if (!text.trim()) { setError('Please paste some text or upload a file first.'); return; }
    if (!apiKey.trim()) { setError(`Please enter your ${prov.label} API key.`); return; }
    setError(''); setLoading(true); setResult(null);

    const prompt = `You are an expert plagiarism detection AI. Analyze the following text and return ONLY valid JSON with this structure:
{
  "originalityScore": <number 0-100>,
  "summary": "<2-3 sentence originality assessment>",
  "suspiciousPassages": ["<passage1>", "<passage2>"],
  "commonPhrases": ["<phrase1>", "<phrase2>"],
  "suggestions": ["<suggestion1>", "<suggestion2>"],
  "rawReport": "<detailed analysis paragraph>"
}
Rules: originalityScore 100=original, 0=plagiarized. Max 5 items each list.

TEXT:
---
${text.slice(0, 6000)}
---`;

    try {
      const res = await fetch(prov.url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: prov.model,
          messages: [
            { role: 'system', content: 'You are a plagiarism detection AI. Respond with valid JSON only, no markdown.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.2,
          max_tokens: 1200,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || `API Error ${res.status}`);
      }

      const data = await res.json();
      const raw = data.choices?.[0]?.message?.content || '{}';
      const jsonMatch = raw.match(/```json\s*([\s\S]*?)```/) || raw.match(/({[\s\S]*})/);
      const parsed: PlagiarismResult = JSON.parse((jsonMatch ? jsonMatch[1] : raw).trim());
      setResult(parsed);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Check your API key and try again.');
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = (s: number) => s >= 80 ? '#22c55e' : s >= 50 ? '#f59e0b' : '#ef4444';
  const scoreLabel = (s: number) => s >= 80 ? 'Highly Original' : s >= 60 ? 'Mostly Original' : s >= 40 ? 'Moderately Original' : 'Potentially Plagiarized';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background-color)', fontFamily: 'var(--font-family)' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)', padding: '20px 32px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
        <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.25)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}>
          ← Dashboard
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ color: 'white', margin: 0, fontSize: '1.6rem', fontWeight: 700 }}>🔍 AI Plagiarism Checker</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', margin: '4px 0 0', fontSize: '14px' }}>Upload or paste content to check originality using AI</p>
        </div>
        <div style={{ background: prov.badgeColor + '33', border: `1px solid ${prov.badgeColor}66`, borderRadius: '8px', padding: '6px 14px', color: prov.badgeColor, fontSize: '13px', fontWeight: 700 }}>
          {prov.badge} {prov.label}
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

        {/* LEFT — Input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Provider Selector */}
          <div style={{ background: 'var(--surface-color, #f8fafc)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '12px', fontSize: '14px', color: 'var(--text-color)' }}>
              🤖 AI Provider
            </label>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
              {(Object.keys(PROVIDERS) as ProviderKey[]).map(p => (
                <button key={p} onClick={() => switchProvider(p)} style={{
                  flex: 1, padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px',
                  border: provider === p ? `2px solid ${PROVIDERS[p].badgeColor}` : '2px solid transparent',
                  background: provider === p ? PROVIDERS[p].badgeColor + '22' : 'var(--background-color)',
                  color: provider === p ? PROVIDERS[p].badgeColor : 'var(--text-color)',
                  transition: 'all 0.2s',
                }}>
                  {PROVIDERS[p].badge} {PROVIDERS[p].label}
                </button>
              ))}
            </div>
            <a href={prov.signupUrl} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: prov.badgeColor, fontWeight: 600, textDecoration: 'none' }}>
              🔗 {prov.signupLabel}
            </a>

            <label style={{ display: 'block', fontWeight: 600, margin: '14px 0 8px', fontSize: '14px', color: 'var(--text-color)' }}>
              🔑 {prov.label} API Key
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="password" value={apiKey} onChange={e => saveApiKey(e.target.value)}
                placeholder={prov.placeholder}
                style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--background-color)', color: 'var(--text-color)', fontSize: '14px' }} />
              <button onClick={() => saveApiKey('')} style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap' }}>
                ✕ Clear
              </button>
            </div>
            {apiKey
              ? <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#22c55e', fontWeight: 600 }}>✅ Active key ends in: ...{apiKey.slice(-6)}</p>
              : <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#f59e0b', fontWeight: 600 }}>⚠️ No key — paste your {prov.label} key above</p>
            }
          </div>

          {/* File Upload */}
          <div onClick={() => fileInputRef.current?.click()} style={{ border: '2px dashed #a78bfa', borderRadius: '12px', padding: '28px', textAlign: 'center', cursor: 'pointer', background: 'rgba(167,139,250,0.05)', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(167,139,250,0.12)'; e.currentTarget.style.borderColor = '#7c3aed'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(167,139,250,0.05)'; e.currentTarget.style.borderColor = '#a78bfa'; }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📁</div>
            <div style={{ fontWeight: 600, color: '#7c3aed', marginBottom: '4px' }}>{fileName ? `✅ ${fileName}` : 'Click to upload a file'}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted-color, #9ca3af)' }}>Supports .pdf, .txt, .md, .py, .js, .html, .csv</div>
            <input ref={fileInputRef} type="file" style={{ display: 'none' }} accept=".pdf,.txt,.md,.json,.js,.ts,.py,.html,.css,.csv" onChange={handleFileUpload} />
          </div>

          {/* Text Area */}
          <div style={{ background: 'var(--surface-color, #f8fafc)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '14px', color: 'var(--text-color)' }}>📝 Or paste your text</label>
            <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Paste the content you want to check for plagiarism here..."
              style={{ width: '100%', minHeight: '200px', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--background-color)', color: 'var(--text-color)', fontSize: '14px', lineHeight: '1.6', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted-color, #9ca3af)' }}>{text.length.toLocaleString()} chars · {text.split(/\s+/).filter(Boolean).length.toLocaleString()} words</span>
              {text && <button onClick={() => { setText(''); setFileName(''); setResult(null); setError(''); }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px' }}>✕ Clear</button>}
            </div>
          </div>

          {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px 16px', color: '#dc2626', fontSize: '14px' }}>❌ {error}</div>}

          <button onClick={analyze} disabled={loading} style={{ background: loading ? '#a78bfa' : 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: 'white', border: 'none', borderRadius: '10px', padding: '16px 24px', fontSize: '16px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 4px 15px rgba(124,58,237,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            {loading ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span> Analyzing...</> : '🔍 Analyze for Plagiarism'}
          </button>
        </div>

        {/* RIGHT — Results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {!result && !loading && (
            <div style={{ background: 'var(--surface-color, #f8fafc)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '60px 40px', textAlign: 'center', color: 'var(--text-muted-color, #9ca3af)' }}>
              <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🛡️</div>
              <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '8px', color: 'var(--text-color)' }}>Results Will Appear Here</div>
              <div style={{ fontSize: '14px' }}>Upload a file or paste text, pick a provider, and click Analyze.</div>
            </div>
          )}

          {loading && (
            <div style={{ background: 'var(--surface-color, #f8fafc)', border: '1px solid #c4b5fd', borderRadius: '12px', padding: '60px 40px', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px', animation: 'pulse 1.5s ease-in-out infinite' }}>🔍</div>
              <div style={{ fontWeight: 600, fontSize: '1.1rem', color: '#7c3aed', marginBottom: '8px' }}>Analyzing your document...</div>
              <div style={{ fontSize: '14px', color: 'var(--text-muted-color, #9ca3af)' }}>AI is checking for plagiarism, clichés, and originality</div>
            </div>
          )}

          {result && (
            <>
              <div style={{ background: `linear-gradient(135deg, ${scoreColor(result.originalityScore)}22, ${scoreColor(result.originalityScore)}11)`, border: `2px solid ${scoreColor(result.originalityScore)}44`, borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
                <div style={{ fontSize: '5rem', fontWeight: 800, color: scoreColor(result.originalityScore), lineHeight: 1, marginBottom: '8px' }}>{result.originalityScore}%</div>
                <div style={{ fontWeight: 700, fontSize: '1.2rem', color: scoreColor(result.originalityScore), marginBottom: '8px' }}>{scoreLabel(result.originalityScore)}</div>
                <div style={{ fontSize: '14px', color: 'var(--text-color)', opacity: 0.8, lineHeight: 1.6 }}>{result.summary}</div>
              </div>

              {result.suspiciousPassages?.length > 0 && (
                <div style={{ background: 'var(--surface-color, #f8fafc)', border: '1px solid #fecaca', borderRadius: '12px', padding: '20px' }}>
                  <h3 style={{ margin: '0 0 12px', fontSize: '15px', color: '#dc2626' }}>⚠️ Suspicious Passages</h3>
                  {result.suspiciousPassages.map((p, i) => (
                    <div key={i} style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '10px 12px', marginBottom: '8px', fontSize: '13px', color: '#7f1d1d', fontStyle: 'italic' }}>"{p}"</div>
                  ))}
                </div>
              )}

              {result.commonPhrases?.length > 0 && (
                <div style={{ background: 'var(--surface-color, #f8fafc)', border: '1px solid #fde68a', borderRadius: '12px', padding: '20px' }}>
                  <h3 style={{ margin: '0 0 12px', fontSize: '15px', color: '#b45309' }}>💬 Common / Clichéd Phrases</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {result.commonPhrases.map((p, i) => (
                      <span key={i} style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '20px', padding: '4px 12px', fontSize: '13px', color: '#92400e' }}>{p}</span>
                    ))}
                  </div>
                </div>
              )}

              {result.suggestions?.length > 0 && (
                <div style={{ background: 'var(--surface-color, #f8fafc)', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '20px' }}>
                  <h3 style={{ margin: '0 0 12px', fontSize: '15px', color: '#15803d' }}>💡 Suggestions</h3>
                  {result.suggestions.map((s, i) => (
                    <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '8px', fontSize: '13px', color: 'var(--text-color)', lineHeight: 1.5 }}>
                      <span style={{ color: '#22c55e', fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>{s}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ background: 'var(--surface-color, #f8fafc)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
                <h3 style={{ margin: '0 0 12px', fontSize: '15px', color: 'var(--text-color)' }}>📄 Full Report</h3>
                <div style={{ fontSize: '13px', lineHeight: '1.7', color: 'var(--text-color)', whiteSpace: 'pre-wrap', opacity: 0.85 }}>{result.rawReport}</div>
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
