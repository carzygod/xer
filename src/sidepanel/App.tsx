import { useState, useEffect } from 'react';
import { Settings, DEFAULT_SETTINGS } from '../shared/types';
import { translations, Locale } from './i18n';

function App() {
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
    const [activeTab, setActiveTab] = useState<'dashboard' | 'settings' | 'test'>('dashboard');
    const [isRunning, setIsRunning] = useState(false);
    const [saveStatus, setSaveStatus] = useState('');

    const t = translations[settings.language];

    // Load stats/settings
    useEffect(() => {
        chrome.storage.local.get(['settings', 'isRunning'], (result) => {
            if (result.settings) setSettings({ ...DEFAULT_SETTINGS, ...result.settings });
            if (result.isRunning !== undefined) setIsRunning(result.isRunning);
        });

        const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
            if (changes.isRunning) setIsRunning(changes.isRunning.newValue);
        };
        chrome.storage.onChanged.addListener(listener);
        return () => chrome.storage.onChanged.removeListener(listener);
    }, []);

    const saveSettings = (newSettings: Settings) => {
        setSettings(newSettings);
        chrome.storage.local.set({ settings: newSettings }, () => {
            setSaveStatus(translations[newSettings.language].msg_saved);
            setTimeout(() => setSaveStatus(''), 2000);
        });
    };

    const handleStart = () => {
        chrome.runtime.sendMessage({ type: 'START_TASK', settings });
    };

    const handlePause = () => {
        chrome.runtime.sendMessage({ type: 'PAUSE_TASK' });
    };

    // Helper for deeply nested updates
    const updateInterval = (type: keyof Settings['intervals'], field: 'min' | 'max', value: string) => {
        const val = parseInt(value) || 0;
        const newSettings = {
            ...settings,
            intervals: {
                ...settings.intervals,
                [type]: { ...settings.intervals[type], [field]: val }
            }
        };
        saveSettings(newSettings);
    };

    const updateAI = (field: keyof Settings['ai'], value: string) => {
        const newSettings = {
            ...settings,
            ai: { ...settings.ai, [field]: value }
        };
        saveSettings(newSettings);
    };

    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Listen for errors
    useEffect(() => {
        const listener = (message: any) => {
            if (message.type === 'SHOW_ERROR') {
                setErrorMsg(message.message);
                // Auto-close after 5 seconds
                setTimeout(() => setErrorMsg(null), 5000);
            }
        };
        chrome.runtime.onMessage.addListener(listener);
        return () => chrome.runtime.onMessage.removeListener(listener);
    }, []);

    return (
        <div className="container">
            {errorMsg && (
                <div className="error-toast" onClick={() => setErrorMsg(null)}>
                    {errorMsg}
                    <span className="close-btn">&times;</span>
                </div>
            )}
            <div className="header">
                <img src="/logo.svg" alt="xer" style={{ width: '24px', height: '24px', marginRight: '12px' }} />
                <h1>{t.title}</h1>
            </div>

            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`}
                    onClick={() => setActiveTab('dashboard')}
                >
                    {t.dashboard}
                </button>
                <button
                    className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
                    onClick={() => setActiveTab('settings')}
                >
                    {t.settings}
                </button>
                <button
                    className={`tab ${activeTab === 'test' ? 'active' : ''}`}
                    onClick={() => setActiveTab('test')}
                >
                    {t.test}
                </button>
            </div>

            {activeTab === 'dashboard' && (
                <div className="tab-content">
                    <div className="status-section">
                        <p>Status: <strong>{isRunning ? t.status_running : t.status_stopped}</strong></p>
                        <p style={{ fontSize: '0.9em', color: '#71767b' }}>{settings.targetUrl}</p>
                    </div>

                    <div className="controls-section">
                        {!isRunning ? (
                            <button onClick={handleStart} className="btn-primary" disabled={!settings.ai.apiKey}>
                                {t.btn_start}
                            </button>
                        ) : (
                            <button onClick={handlePause} className="btn-secondary">{t.btn_pause}</button>
                        )}
                        {!settings.ai.apiKey && <p className="error-text">⚠️ API Key required in Settings</p>}
                    </div>
                </div>
            )}

            {activeTab === 'settings' && (
                <div className="tab-content settings-form">
                    <div className="form-group">
                        <label>{t.lbl_language}</label>
                        <select
                            value={settings.language}
                            onChange={(e) => saveSettings({ ...settings, language: e.target.value as Locale })}
                        >
                            <option value="zh_CN">简体中文</option>
                            <option value="zh_TW">繁體中文</option>
                            <option value="en">English</option>
                            <option value="ru">Русский</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>{t.lbl_target_url}</label>
                        <input
                            type="text"
                            value={settings.targetUrl}
                            onChange={(e) => saveSettings({ ...settings, targetUrl: e.target.value })}
                        />
                    </div>

                    <h3>{t.sect_intervals}</h3>
                    {['scroll', 'like', 'reply', 'retweet'].map((key) => (
                        <div key={key} className="form-group interval-group">
                            <label>{t[`lbl_${key}_interval` as keyof typeof t]}</label>
                            <div className="interval-inputs">
                                <input
                                    type="number"
                                    value={settings.intervals[key as keyof Settings['intervals']].min}
                                    onChange={(e) => updateInterval(key as keyof Settings['intervals'], 'min', e.target.value)}
                                />
                                <span>-</span>
                                <input
                                    type="number"
                                    value={settings.intervals[key as keyof Settings['intervals']].max}
                                    onChange={(e) => updateInterval(key as keyof Settings['intervals'], 'max', e.target.value)}
                                />
                            </div>
                        </div>
                    ))}

                    <h3>{t.sect_ai}</h3>
                    <div className="form-group">
                        <label>{t.lbl_ai_api_key}</label>
                        <input type="password" value={settings.ai.apiKey} onChange={(e) => updateAI('apiKey', e.target.value)} placeholder="your_key" />
                    </div>
                    <div className="form-group">
                        <label>{t.lbl_ai_api_url}</label>
                        <input type="text" value={settings.ai.apiUrl} onChange={(e) => updateAI('apiUrl', e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>{t.lbl_ai_model}</label>
                        <input type="text" value={settings.ai.model} onChange={(e) => updateAI('model', e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>{t.lbl_ai_embed_model}</label>
                        <input type="text" value={settings.ai.embeddingsModel} onChange={(e) => updateAI('embeddingsModel', e.target.value)} />
                    </div>

                    {saveStatus && <div className="save-toast">{saveStatus}</div>}
                </div>
            )}

            {activeTab === 'test' && (
                <div className="tab-content">
                    <h3>{t.test_actions}</h3>
                    <div className="controls-section" style={{ gap: '10px', display: 'flex', flexDirection: 'column' }}>
                        <button onClick={() => chrome.runtime.sendMessage({ type: 'TEST_SCROLL' })} className="btn-secondary">
                            {t.btn_test_scroll}
                        </button>
                        <button onClick={() => chrome.runtime.sendMessage({ type: 'TEST_LIKE' })} className="btn-secondary">
                            {t.btn_test_like}
                        </button>
                        <button onClick={() => chrome.runtime.sendMessage({ type: 'TEST_REPLY' })} className="btn-secondary">
                            {t.btn_test_reply}
                        </button>
                        <button onClick={() => chrome.runtime.sendMessage({ type: 'TEST_RETWEET' })} className="btn-secondary">
                            {t.btn_test_retweet}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default App
