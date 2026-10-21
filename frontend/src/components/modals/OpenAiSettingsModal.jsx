import React, { useState, useEffect } from 'react';
import { Sparkles, X, CheckCircle2, AlertCircle, Key, Cpu, Zap, ShieldCheck, RefreshCw } from 'lucide-react';
import { api } from '../../utils/api';

export function OpenAiSettingsModal({ isOpen, onClose }) {
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('gpt-4o-mini');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      setError(null);
      setSuccess(null);
      setTestResult(null);
    }
  }, [isOpen]);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await api.get('/ai/status');
      setStatus(res);
      if (res.model) setSelectedModel(res.model);
    } catch (err) {
      console.warn('Could not fetch AI status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndTest = async (e) => {
    e.preventDefault();
    if (!apiKey || !apiKey.trim().startsWith('sk-')) {
      setError('Please provide a valid OpenAI API key starting with "sk-"');
      return;
    }

    setTesting(true);
    setError(null);
    setSuccess(null);
    setTestResult(null);

    try {
      const res = await api.post('/ai/key', {
        apiKey: apiKey.trim(),
        model: selectedModel
      });

      setSuccess(res.message || 'Connected to OpenAI successfully!');
      fetchStatus();
      setApiKey('');
    } catch (err) {
      setError(err.message || 'Failed to connect to OpenAI. Check key and billing status.');
    } finally {
      setTesting(false);
    }
  };

  const handleRunSampleTest = async () => {
    setTesting(true);
    setTestResult(null);
    setError(null);
    try {
      const res = await api.post('/ai/test', {
        text: 'collage jana hai 10 baje se pahle',
        tone: 'Natural'
      });
      setTestResult(res);
    } catch (err) {
      setError(err.message || 'Sample test failed.');
    } finally {
      setTesting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-wa-dark-panel rounded-2xl shadow-2xl border border-gray-200 dark:border-wa-dark-border overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base font-bold">OpenAI Normalizer Engine</h2>
              <p className="text-[11px] text-emerald-100">Direct AI-Powered Chat Translation & Language Detection</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-full transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Current Engine Status Banner */}
          <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
            status?.openaiConfigured
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
          }`}>
            <div className="flex items-center gap-2.5">
              <div className={`w-3 h-3 rounded-full shrink-0 ${
                status?.openaiConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`} />
              <div>
                <div className="text-xs font-bold">
                  {status?.openaiConfigured ? 'OpenAI Engine Active' : 'Contextual Local Engine Active'}
                </div>
                <div className="text-[11px] opacity-80">
                  {status?.openaiConfigured
                    ? `Model: ${status?.model || 'gpt-4o-mini'} • Key: ${status?.maskedKey}`
                    : 'Connect your OpenAI API key below for human-level slang normalization'}
                </div>
              </div>
            </div>

            <button
              onClick={fetchStatus}
              disabled={loading}
              className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors text-xs"
              title="Refresh status"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Feedback messages */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs rounded-xl flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {/* Key Configuration Form */}
          <form onSubmit={handleSaveAndTest} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-wa-dark-text mb-1">
                OpenAI API Key
              </label>
              <div className="relative">
                <Key className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={status?.openaiConfigured ? 'Enter new key to update (sk-...)' : 'Paste sk-proj-... or sk-...'}
                  className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-wa-dark-header border border-gray-300 dark:border-wa-dark-border rounded-xl text-xs text-gray-900 dark:text-wa-dark-text focus:outline-none focus:border-wa-teal focus:ring-1 focus:ring-wa-teal"
                />
              </div>
              <p className="text-[10px] text-gray-500 dark:text-wa-dark-muted mt-1">
                Saved securely on your local backend in <code className="font-mono bg-gray-100 dark:bg-wa-dark-header px-1 rounded">backend/.env</code>.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-wa-dark-text mb-1">
                AI Model
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'gpt-4o-mini', title: 'GPT-4o Mini', desc: 'Fast, cheap, recommended' },
                  { id: 'gpt-4o', title: 'GPT-4o', desc: 'Highest intelligence & accuracy' }
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedModel(m.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      selectedModel === m.id
                        ? 'border-wa-teal bg-emerald-50/50 dark:bg-emerald-950/20 text-wa-teal'
                        : 'border-gray-200 dark:border-wa-dark-border bg-white dark:bg-wa-dark-header text-gray-700 dark:text-wa-dark-text'
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center justify-between">
                      <span>{m.title}</span>
                      {selectedModel === m.id && <Zap className="w-3.5 h-3.5 text-wa-teal fill-wa-teal" />}
                    </div>
                    <div className="text-[10px] text-gray-500 dark:text-wa-dark-muted mt-0.5">{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={testing || !apiKey.trim()}
              className="w-full py-2.5 bg-wa-teal hover:bg-wa-teal-dark disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2"
            >
              {testing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying with OpenAI...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Connect & Activate OpenAI</span>
                </>
              )}
            </button>
          </form>

          {/* Test Live Normalization Sample */}
          {status?.openaiConfigured && (
            <div className="pt-3 border-t border-gray-100 dark:border-wa-dark-border/60">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-800 dark:text-wa-dark-text">Test OpenAI Live</span>
                <button
                  type="button"
                  onClick={handleRunSampleTest}
                  disabled={testing}
                  className="px-2.5 py-1 bg-gray-100 dark:bg-wa-dark-header hover:bg-gray-200 dark:hover:bg-wa-dark-border text-[11px] font-semibold text-gray-700 dark:text-wa-dark-text rounded-lg transition-colors"
                >
                  {testing ? 'Testing...' : 'Run Test ("collage jana hai 10 baje se pahle")'}
                </button>
              </div>

              {testResult && (
                <div className="p-3 bg-gray-50 dark:bg-wa-dark-header rounded-xl border border-gray-200 dark:border-wa-dark-border text-xs space-y-1 animate-slide-up">
                  <div className="text-[10px] text-gray-400 font-semibold uppercase">Normalized Output:</div>
                  <div className="font-semibold text-wa-teal text-sm">{testResult.normalized}</div>
                  <div className="text-[10px] text-gray-500 dark:text-wa-dark-muted flex gap-3 pt-1">
                    <span>Language: <b>{testResult.language}</b></span>
                    <span>Confidence: <b>{(testResult.confidence * 100).toFixed(0)}%</b></span>
                    <span>Tone: <b>{testResult.tone}</b></span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
