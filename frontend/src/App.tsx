import { useState, useRef, useEffect } from 'react';
import { Upload, CheckCircle, AlertCircle, Loader2, Filter, X, Languages, Link as LinkIcon, TrendingUp, Search } from 'lucide-react';
import axios from 'axios';

const API_URL = 'http://localhost:3003/api';

// 🎨 BRAND COLORS
const BRAND = {
  primary: '#072447',      // Dark blue
  background: '#eef2f8',   // Light blue/gray
  white: '#ffffff',
  lightGray: '#f5f7fa',
  darkGray: '#6b7280',
};

// Loading steps for the interactive popup (simplified to 4 steps)
const LOADING_STEPS = [
  { id: 1, label: 'Extracting text content...', icon: '📄', duration: 1500 },
  { id: 2, label: 'Analyzing content quality...', icon: '🔍', duration: 2000 },
  { id: 3, label: 'Checking brand compliance...', icon: '🏷️', duration: 2000 },
  { id: 4, label: 'Generating final report...', icon: '📊', duration: 1500 },
];

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string>('');
  const [urlType, setUrlType] = useState<string>('others');
  const [checkMode, setCheckMode] = useState<'file' | 'url'>('file');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Loading animation states
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Filters
  const [selectedSeverity, setSelectedSeverity] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');

  // Tab selection (Issues or SEO)
  const [activeTab, setActiveTab] = useState<'issues' | 'seo'>('issues');

  // Ref for scrolling to issues
  const issuesRef = useRef<HTMLDivElement>(null);

  // Animate loading steps
  useEffect(() => {
    if (loading) {
      setCurrentStep(0);
      setCompletedSteps([]);
      
      let stepIndex = 0;
      const animateSteps = () => {
        if (stepIndex < LOADING_STEPS.length) {
          setCurrentStep(stepIndex);
          
          const timer = setTimeout(() => {
            setCompletedSteps(prev => [...prev, stepIndex]);
            stepIndex++;
            animateSteps();
          }, LOADING_STEPS[stepIndex].duration);
          
          return () => clearTimeout(timer);
        }
      };
      
      animateSteps();
    }
  }, [loading]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API_URL}/upload`, formData);
      setResult(response.data.data);
      setSelectedSeverity(null);
      setSelectedCategory(null);
      setSelectedLanguage('all');
      setActiveTab('issues');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to check file');
    } finally {
      setLoading(false);
    }
  };

  const handleUrlCheck = async () => {
    if (!url || url.trim().length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_URL}/check-url`, {
        url: url.trim(),
        url_type: urlType,
      });
      setResult(response.data.data);
      setSelectedSeverity(null);
      setSelectedCategory(null);
      setSelectedLanguage('all');
      setActiveTab('issues');
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to check URL');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  const getSeverityColor = (severity: string) => {
    const colors: any = {
      critical: 'bg-red-100 text-red-800 border-red-300',
      high: 'bg-orange-100 text-orange-800 border-orange-300',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      low: 'bg-blue-100 text-blue-800 border-blue-300',
    };
    return colors[severity] || colors.low;
  };

  const getSeverityOrder = (severity: string): number => {
    const order: any = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3
    };
    return order[severity.toLowerCase()] ?? 4;
  };


  const getCategoryIcon = (category: string) => {
    const icons: any = {
      grammar: '📝',
      brand: '🏷️',
      numerical: '🔢',
      links: '🔗',
      images: '🖼️',
      cta: '👆',
      tone: '🗣️',
      legal: '⚖️',
      accessibility: '♿',
    };
    return icons[category] || '📋';
  };

  const getCategoryLabel = (category: string) => {
    const labels: any = {
      grammar: 'Grammar & Spelling',
      brand: 'Brand Compliance',
      numerical: 'Numerical Format',
      links: 'Link Validation',
      images: 'Image Validation',
      cta: 'Call-to-Action',
      tone: 'Tone & Language',
      legal: 'Legal Compliance',
      accessibility: 'Accessibility',
    };
    return labels[category] || category;
  };

  const getAllIssues = () => {
    if (!result?.issues) return [];
    
    const allIssues: any[] = [];
    Object.entries(result.issues).forEach(([category, categoryIssues]: [string, any]) => {
      if (Array.isArray(categoryIssues)) {
        categoryIssues.forEach(issue => {
          allIssues.push({ ...issue, categoryName: category });
        });
      }
    });

    // Apply filters
    let filtered = allIssues;
    
    // Severity filter
    if (selectedSeverity) {
      filtered = filtered.filter(i => i.severity === selectedSeverity);
    }
    
    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter(i => i.categoryName === selectedCategory);
    }
    
    // Language filter (only for bilingual content)
    if (selectedLanguage !== 'all' && result.isBilingual) {
      filtered = filtered.filter(i => {
        if (selectedLanguage === 'english') {
          return i.language === 'english' || i.language === 'both';
        } else if (selectedLanguage === 'arabic') {
          return i.language === 'arabic' || i.language === 'both';
        }
        return true;
      });
    }

    // Sort by severity: Critical → High → Medium → Low
    filtered.sort((a, b) => {
      return getSeverityOrder(a.severity) - getSeverityOrder(b.severity);
    });

    return filtered;
  };

  const handleSeverityClick = (severity: string) => {
    setSelectedSeverity(selectedSeverity === severity ? null : severity);
    setSelectedCategory(null);
    setTimeout(() => {
      issuesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(selectedCategory === category ? null : category);
    setSelectedSeverity(null);
    setTimeout(() => {
      issuesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const clearFilters = () => {
    setSelectedSeverity(null);
    setSelectedCategory(null);
    setSelectedLanguage('all');
  };

  return (
    <div className="min-h-screen" style={{ background: `linear-gradient(135deg, ${BRAND.background} 0%, ${BRAND.white} 50%, ${BRAND.background} 100%)` }}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4" style={{ color: BRAND.primary }}>
            Emirates NBD Universal Checker
          </h1>
          <p className="text-xl" style={{ color: BRAND.darkGray }}>
            AI-Powered Brand Compliance & Content Validation
          </p>
        </header>

        {/* Upload Section */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {/* Mode Selector */}
            <div className="flex gap-4 mb-6">
              <button
                onClick={() => {
                  setCheckMode('file');
                  setResult(null);
                  setError(null);
                }}
                className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all ${
                  checkMode === 'file' ? 'text-white shadow-lg' : 'border-2 hover:scale-105'
                }`}
                style={{
                  backgroundColor: checkMode === 'file' ? BRAND.primary : BRAND.white,
                  borderColor: BRAND.primary,
                  color: checkMode === 'file' ? BRAND.white : BRAND.primary,
                }}
              >
                <Upload className="inline-block mr-2" size={20} />
                Upload File
              </button>
              <button
                onClick={() => {
                  setCheckMode('url');
                  setResult(null);
                  setError(null);
                }}
                className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all ${
                  checkMode === 'url' ? 'text-white shadow-lg' : 'border-2 hover:scale-105'
                }`}
                style={{
                  backgroundColor: checkMode === 'url' ? BRAND.primary : BRAND.white,
                  borderColor: BRAND.primary,
                  color: checkMode === 'url' ? BRAND.white : BRAND.primary,
                }}
              >
                <LinkIcon className="inline-block mr-2" size={20} />
                Check URL
              </button>
            </div>

            {checkMode === 'file' ? (
              /* File Upload Mode */
              <>
                <h2 className="text-2xl font-semibold mb-6" style={{ color: BRAND.primary }}>
                  Upload Your Content
                </h2>

                <div
                  className="border-2 border-dashed rounded-xl p-8 text-center transition-colors"
                  style={{
                    borderColor: file ? BRAND.primary : '#d1d5db',
                    backgroundColor: file ? BRAND.background : BRAND.white,
                  }}
                >
                  <Upload className="mx-auto mb-4" size={48} style={{ color: BRAND.darkGray }} />

                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".html,.htm,.jpg,.jpeg,.png,.pdf,.docx"
                  />

                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer font-semibold hover:opacity-80 transition-opacity"
                    style={{ color: BRAND.primary }}
                  >
                    {file ? file.name : 'Click to upload or drag and drop'}
                  </label>

                  <p className="text-sm mt-2" style={{ color: BRAND.darkGray }}>
                    HTML, JPG, PNG, PDF (max 10MB)
                  </p>
                </div>

                <button
                  onClick={handleUpload}
                  disabled={!file || loading}
                  className="w-full mt-6 py-4 rounded-xl font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 flex items-center justify-center gap-2"
                  style={{ backgroundColor: BRAND.primary }}
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Checking...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={20} />
                      Check Content
                    </>
                  )}
                </button>
              </>
            ) : (
              /* URL Check Mode */
              <>
                <h2 className="text-2xl font-semibold mb-6" style={{ color: BRAND.primary }}>
                  Check URL with SEO Analysis
                </h2>

                {/* URL Type Selector */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold mb-3" style={{ color: BRAND.primary }}>
                    URL Type
                  </label>
                  <div className="grid grid-cols-4 gap-3">
                    {['product', 'offer', 'campaign', 'others'].map((type) => (
                      <button
                        key={type}
                        onClick={() => setUrlType(type)}
                        className={`py-3 px-4 rounded-lg font-semibold text-sm transition-all hover:scale-105 ${
                          urlType === type ? 'text-white shadow-lg' : 'border-2'
                        }`}
                        style={{
                          backgroundColor: urlType === type ? BRAND.primary : BRAND.white,
                          borderColor: urlType === type ? BRAND.primary : '#d1d5db',
                          color: urlType === type ? BRAND.white : BRAND.darkGray,
                        }}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* URL Input */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold mb-3" style={{ color: BRAND.primary }}>
                    Enter URL
                  </label>
                  <div className="relative">
                    <LinkIcon
                      className="absolute left-4 top-1/2 transform -translate-y-1/2"
                      size={20}
                      style={{ color: BRAND.darkGray }}
                    />
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://example.com"
                      className="w-full pl-12 pr-4 py-4 rounded-xl border-2 focus:outline-none focus:border-opacity-100 transition-all text-lg"
                      style={{
                        borderColor: url ? BRAND.primary : '#d1d5db',
                        color: BRAND.primary,
                      }}
                    />
                  </div>
                  <p className="text-xs mt-2" style={{ color: BRAND.darkGray }}>
                    We'll analyze content quality, brand compliance, and SEO performance
                  </p>
                </div>

                <button
                  onClick={handleUrlCheck}
                  disabled={!url || loading}
                  className="w-full py-4 rounded-xl font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 flex items-center justify-center gap-2"
                  style={{ backgroundColor: BRAND.primary }}
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Search size={20} />
                      Analyze URL
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="max-w-2xl mx-auto mb-8">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
              <AlertCircle className="text-red-600" size={24} />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Loading Popup */}
        {loading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
            <div 
              className="rounded-3xl shadow-2xl p-8 max-w-md w-full mx-4 transform transition-all duration-300 scale-100 opacity-100"
              style={{ backgroundColor: BRAND.white }}
            >
              {/* Header */}
              <div className="text-center mb-8">
                <div 
                  className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse"
                  style={{ backgroundColor: BRAND.background }}
                >
                  <Loader2 className="animate-spin" size={40} style={{ color: BRAND.primary }} />
                </div>
                <h3 className="text-2xl font-bold mb-2" style={{ color: BRAND.primary }}>
                  Analyzing Your Content
                </h3>
                <p className="text-sm" style={{ color: BRAND.darkGray }}>
                  Please wait while we check your content...
                </p>
              </div>

              {/* Progress Bar */}
              <div className="mb-6">
                <div 
                  className="h-2 rounded-full overflow-hidden"
                  style={{ backgroundColor: BRAND.background }}
                >
                  <div 
                    className="h-full transition-all duration-500 ease-out rounded-full"
                    style={{ 
                      backgroundColor: BRAND.primary,
                      width: `${((completedSteps.length) / LOADING_STEPS.length) * 100}%`
                    }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs" style={{ color: BRAND.darkGray }}>
                  <span>Step {currentStep + 1} of {LOADING_STEPS.length}</span>
                  <span>{Math.round(((completedSteps.length) / LOADING_STEPS.length) * 100)}%</span>
                </div>
              </div>

              {/* Steps List */}
              <div className="space-y-3">
                {LOADING_STEPS.map((step, index) => {
                  const isCompleted = completedSteps.includes(index);
                  const isCurrent = currentStep === index;
                  const isPending = index > currentStep;

                  return (
                    <div
                      key={step.id}
                      className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${
                        isCurrent ? 'scale-105' : ''
                      }`}
                      style={{
                        backgroundColor: isCompleted 
                          ? BRAND.background 
                          : isCurrent 
                          ? BRAND.lightGray 
                          : 'transparent',
                        opacity: isPending ? 0.4 : 1,
                      }}
                    >
                      {/* Icon/Status */}
                      <div className="flex-shrink-0">
                        {isCompleted ? (
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: BRAND.primary }}
                          >
                            <CheckCircle size={16} style={{ color: BRAND.white }} />
                          </div>
                        ) : isCurrent ? (
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center animate-pulse"
                            style={{ backgroundColor: BRAND.primary }}
                          >
                            <span className="text-white text-lg">{step.icon}</span>
                          </div>
                        ) : (
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: BRAND.lightGray }}
                          >
                            <span className="text-lg opacity-50">{step.icon}</span>
                          </div>
                        )}
                      </div>

                      {/* Label */}
                      <div className="flex-1">
                        <p 
                          className={`text-sm font-semibold ${
                            isCurrent ? 'animate-pulse' : ''
                          }`}
                          style={{ 
                            color: isCompleted || isCurrent ? BRAND.primary : BRAND.darkGray 
                          }}
                        >
                          {step.label}
                        </p>
                      </div>

                      {/* Animated dots for current step */}
                      {isCurrent && (
                        <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: BRAND.primary, animationDelay: '0ms' }}></span>
                          <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: BRAND.primary, animationDelay: '150ms' }}></span>
                          <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: BRAND.primary, animationDelay: '300ms' }}></span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Fun Fact */}
              <div 
                className="mt-6 p-4 rounded-xl text-center"
                style={{ backgroundColor: BRAND.background }}
              >
                <p className="text-xs font-semibold mb-1" style={{ color: BRAND.primary }}>
                  💡 Did you know?
                </p>
                <p className="text-xs" style={{ color: BRAND.darkGray }}>
                  Our AI checks over 50+ brand compliance rules in seconds!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="max-w-6xl mx-auto">
            
            {/* 🌐 Bilingual Content Detection Badge */}
            {result.isBilingual && (
              <div 
                className="rounded-2xl shadow-xl p-8 mb-8 text-white"
                style={{ 
                  background: `linear-gradient(135deg, ${BRAND.primary} 0%, #0a3d6b 100%)`
                }}
              >
                <div className="flex items-center justify-center gap-4 mb-6">
                  <Languages size={48} />
                  <div>
                    <h3 className="text-3xl font-bold">Bilingual Content Detected</h3>
                    <p className="text-blue-100 text-lg">
                      This EDM contains both English and Arabic content
                    </p>
                  </div>
                </div>
                
                {/* Language-specific metrics */}
                <div className="grid grid-cols-3 gap-6 mt-6">
                  <div 
                    className="backdrop-blur rounded-xl p-6 text-center border-2"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)', borderColor: 'rgba(255, 255, 255, 0.3)' }}
                  >
                    <div className="text-xl font-bold mb-2">🇬🇧 English Issues</div>
                    <div className="text-5xl font-bold">{result.issuesByLanguage?.english?.length || 0}</div>
                  </div>
                  <div 
                    className="backdrop-blur rounded-xl p-6 text-center border-2"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)', borderColor: 'rgba(255, 255, 255, 0.3)' }}
                  >
                    <div className="text-xl font-bold mb-2">🇦🇪 Arabic Issues</div>
                    <div className="text-5xl font-bold">{result.issuesByLanguage?.arabic?.length || 0}</div>
                  </div>
                  <div 
                    className="backdrop-blur rounded-xl p-6 text-center border-2"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)', borderColor: 'rgba(255, 255, 255, 0.3)' }}
                  >
                    <div className="text-xl font-bold mb-2">🌐 General</div>
                    <div className="text-5xl font-bold">{result.issuesByLanguage?.both?.length || 0}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Score Card */}
            <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-bold" style={{ color: BRAND.primary }}>
                    Overall Quality Score
                  </h2>
                  {result.isBilingual && (
                    <div className="flex items-center gap-2 mt-2">
                      <Languages size={20} style={{ color: BRAND.primary }} />
                      <span className="text-sm font-semibold" style={{ color: BRAND.darkGray }}>
                        Bilingual Analysis: {result.languages?.join(' + ').toUpperCase() || 'ENG + ARA'}
                      </span>
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <div className={`text-6xl font-bold ${getScoreColor(result.metrics.complianceScore)}`}>
                    {result.metrics.complianceScore}
                  </div>
                  <div className="text-sm" style={{ color: BRAND.darkGray }}>out of 100</div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <button
                  onClick={() => handleSeverityClick('critical')}
                  className={`rounded-lg p-4 transition-all hover:scale-105 cursor-pointer ${
                    selectedSeverity === 'critical' 
                      ? 'bg-red-200 border-2 border-red-400 shadow-lg' 
                      : 'bg-red-50 hover:bg-red-100'
                  }`}
                >
                  <div className="font-semibold text-red-700 flex items-center justify-center gap-1 text-sm">
                    Critical {selectedSeverity === 'critical' && <Filter size={14} />}
                  </div>
                  <div className="text-2xl font-bold text-red-600">{result.metrics.criticalIssues}</div>
                </button>
                
                <button
                  onClick={() => handleSeverityClick('high')}
                  className={`rounded-lg p-4 transition-all hover:scale-105 cursor-pointer ${
                    selectedSeverity === 'high' 
                      ? 'bg-orange-200 border-2 border-orange-400 shadow-lg' 
                      : 'bg-orange-50 hover:bg-orange-100'
                  }`}
                >
                  <div className="font-semibold text-orange-700 flex items-center justify-center gap-1 text-sm">
                    High {selectedSeverity === 'high' && <Filter size={14} />}
                  </div>
                  <div className="text-2xl font-bold text-orange-600">{result.metrics.highIssues}</div>
                </button>
                
                <button
                  onClick={() => handleSeverityClick('medium')}
                  className={`rounded-lg p-4 transition-all hover:scale-105 cursor-pointer ${
                    selectedSeverity === 'medium' 
                      ? 'bg-yellow-200 border-2 border-yellow-400 shadow-lg' 
                      : 'bg-yellow-50 hover:bg-yellow-100'
                  }`}
                >
                  <div className="font-semibold text-yellow-700 flex items-center justify-center gap-1 text-sm">
                    Medium {selectedSeverity === 'medium' && <Filter size={14} />}
                  </div>
                  <div className="text-2xl font-bold text-yellow-600">{result.metrics.mediumIssues}</div>
                </button>
                
                <button
                  onClick={() => handleSeverityClick('low')}
                  className={`rounded-lg p-4 transition-all hover:scale-105 cursor-pointer ${
                    selectedSeverity === 'low' 
                      ? 'bg-blue-200 border-2 border-blue-400 shadow-lg' 
                      : 'bg-blue-50 hover:bg-blue-100'
                  }`}
                >
                  <div className="font-semibold text-blue-700 flex items-center justify-center gap-1 text-sm">
                    Low {selectedSeverity === 'low' && <Filter size={14} />}
                  </div>
                  <div className="text-2xl font-bold text-blue-600">{result.metrics.lowIssues}</div>
                </button>
              </div>

              <div className="mt-4 text-sm" style={{ color: BRAND.darkGray }}>
                Total Issues: {result.metrics.totalIssues} • Processing Time: {(result.processingTime / 1000).toFixed(2)}s
              </div>
            </div>

            {/* Tabs for Issues and SEO */}
            {result.fileType === 'url' && result.seoAnalysis && (
              <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
                <div className="flex gap-4 mb-6">
                  <button
                    onClick={() => setActiveTab('issues')}
                    className={`flex-1 py-4 px-6 rounded-xl font-semibold text-lg transition-all ${
                      activeTab === 'issues' ? 'text-white shadow-lg' : 'border-2 hover:scale-105'
                    }`}
                    style={{
                      backgroundColor: activeTab === 'issues' ? BRAND.primary : BRAND.white,
                      borderColor: BRAND.primary,
                      color: activeTab === 'issues' ? BRAND.white : BRAND.primary,
                    }}
                  >
                    <AlertCircle className="inline-block mr-2" size={20} />
                    Content Issues ({result.metrics.totalIssues})
                  </button>
                  <button
                    onClick={() => setActiveTab('seo')}
                    className={`flex-1 py-4 px-6 rounded-xl font-semibold text-lg transition-all ${
                      activeTab === 'seo' ? 'text-white shadow-lg' : 'border-2 hover:scale-105'
                    }`}
                    style={{
                      backgroundColor: activeTab === 'seo' ? BRAND.primary : BRAND.white,
                      borderColor: BRAND.primary,
                      color: activeTab === 'seo' ? BRAND.white : BRAND.primary,
                    }}
                  >
                    <TrendingUp className="inline-block mr-2" size={20} />
                    SEO Analysis
                  </button>
                </div>
              </div>
            )}

            {/* Extracted Text Preview */}
            {result.extractedText && activeTab === 'issues' && (
              <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
                <h2 className="text-2xl font-bold mb-4" style={{ color: BRAND.primary }}>
                  Extracted Text Preview
                </h2>
                <div className="rounded-lg p-4 max-h-60 overflow-y-auto" style={{ backgroundColor: BRAND.lightGray }}>
                  <p className="whitespace-pre-wrap font-mono text-sm" style={{ color: BRAND.darkGray }}>
                    {result.extractedText}...
                  </p>
                </div>
                <p className="text-xs mt-2" style={{ color: BRAND.darkGray }}>
                  Showing first 500 characters
                </p>
              </div>
            )}

            {/* Issues Section */}
            {activeTab === 'issues' && result.metrics.totalIssues > 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-8" ref={issuesRef}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold" style={{ color: BRAND.primary }}>
                    Issues Found ({getAllIssues().length}{getAllIssues().length !== result.metrics.totalIssues && ` of ${result.metrics.totalIssues}`})
                    {selectedCategory && (
                      <span className="text-sm font-normal ml-2" style={{ color: BRAND.darkGray }}>
                        • Sorted by severity (Critical → Low)
                      </span>
                    )}
                  </h2>
                  
                  {(selectedSeverity || selectedCategory || selectedLanguage !== 'all') && (
                    <button
                      onClick={clearFilters}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-semibold hover:opacity-80"
                      style={{ backgroundColor: BRAND.lightGray, color: BRAND.primary }}
                    >
                      <X size={16} />
                      Clear All Filters
                    </button>
                  )}
                </div>

                {/* 🌐 Language Filter Tabs (only show if bilingual) */}
                {result.isBilingual && (
                  <div className="mb-8">
                    <div className="flex items-center gap-2 mb-3">
                      <Languages size={20} style={{ color: BRAND.primary }} />
                      <h3 className="font-bold" style={{ color: BRAND.primary }}>Filter by Language</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <button
                        onClick={() => setSelectedLanguage('all')}
                        className={`py-4 px-6 rounded-xl font-semibold transition-all hover:scale-105 ${
                          selectedLanguage === 'all'
                            ? 'shadow-lg text-white'
                            : 'bg-white border-2 hover:border-3'
                        }`}
                        style={{ 
                          backgroundColor: selectedLanguage === 'all' ? BRAND.primary : BRAND.white,
                          borderColor: BRAND.primary,
                          color: selectedLanguage === 'all' ? BRAND.white : BRAND.primary
                        }}
                      >
                        <div className="text-2xl mb-1">🌐</div>
                        <div>All Issues</div>
                        <div className="text-2xl font-bold mt-1">{result.metrics.totalIssues}</div>
                      </button>
                      
                      <button
                        onClick={() => setSelectedLanguage('english')}
                        className={`py-4 px-6 rounded-xl font-semibold transition-all hover:scale-105 ${
                          selectedLanguage === 'english'
                            ? 'shadow-lg text-white'
                            : 'bg-white border-2 hover:border-3'
                        }`}
                        style={{ 
                          backgroundColor: selectedLanguage === 'english' ? BRAND.primary : BRAND.white,
                          borderColor: BRAND.primary,
                          color: selectedLanguage === 'english' ? BRAND.white : BRAND.primary
                        }}
                      >
                        <div className="text-2xl mb-1">🇬🇧</div>
                        <div>English Only</div>
                        <div className="text-2xl font-bold mt-1">{result.issuesByLanguage?.english?.length || 0}</div>
                      </button>
                      
                      <button
                        onClick={() => setSelectedLanguage('arabic')}
                        className={`py-4 px-6 rounded-xl font-semibold transition-all hover:scale-105 ${
                          selectedLanguage === 'arabic'
                            ? 'shadow-lg text-white'
                            : 'bg-white border-2 hover:border-3'
                        }`}
                        style={{ 
                          backgroundColor: selectedLanguage === 'arabic' ? BRAND.primary : BRAND.white,
                          borderColor: BRAND.primary,
                          color: selectedLanguage === 'arabic' ? BRAND.white : BRAND.primary
                        }}
                      >
                        <div className="text-2xl mb-1">🇦🇪</div>
                        <div>Arabic Only</div>
                        <div className="text-2xl font-bold mt-1">{result.issuesByLanguage?.arabic?.length || 0}</div>
                      </button>
                    </div>
                  </div>
                )}

                {/* Category Tabs */}
                <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mb-6">
                  {Object.entries(result.issues).map(([category, categoryIssues]: [string, any]) => (
                    categoryIssues.length > 0 && (
                      <button
                        key={category}
                        onClick={() => handleCategoryClick(category)}
                        className={`rounded-lg p-3 text-center transition-all hover:scale-105 cursor-pointer ${
                          selectedCategory === category
                            ? 'text-white shadow-lg'
                            : 'border-2'
                        }`}
                        style={{
                          backgroundColor: selectedCategory === category ? BRAND.primary : BRAND.background,
                          borderColor: selectedCategory === category ? BRAND.primary : BRAND.background,
                          color: selectedCategory === category ? BRAND.white : BRAND.primary
                        }}
                      >
                        <div className="text-2xl mb-1">{getCategoryIcon(category)}</div>
                        <div className="text-xs font-semibold">
                          {getCategoryLabel(category)}
                        </div>
                        <div className="text-lg font-bold">
                          {categoryIssues.length}
                        </div>
                        {selectedCategory === category && (
                          <div className="text-xs mt-1">
                            <Filter size={12} className="inline" /> Filtered
                          </div>
                        )}
                      </button>
                    )
                  ))}
                </div>

                {/* Issues List */}
                {getAllIssues().length === 0 ? (
                  <div className="text-center py-8" style={{ color: BRAND.darkGray }}>
                    No issues match the selected filters
                  </div>
                ) : (
                  <div className="space-y-4">
                    {getAllIssues().map((issue: any, index: number) => (
                      <div key={index} className={`border-2 rounded-lg p-4 ${getSeverityColor(issue.severity)}`}>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{getCategoryIcon(issue.categoryName)}</span>
                            <span className="font-bold text-sm uppercase">{issue.severity}</span>
                            
                            {/* Language badge on each issue */}
                            {result.isBilingual && issue.language && (
                              <span 
                                className="inline-block px-3 py-1 rounded-full text-xs font-bold"
                                style={{ 
                                  backgroundColor: BRAND.primary,
                                  color: BRAND.white
                                }}
                              >
                                {issue.language === 'english' && '🇬🇧 EN'}
                                {issue.language === 'arabic' && '🇦🇪 AR'}
                                {issue.language === 'both' && '🌐 Both'}
                              </span>
                            )}
                          </div>
                          <span className="text-xs opacity-75 bg-white px-2 py-1 rounded">
                            {getCategoryLabel(issue.categoryName)}
                          </span>
                        </div>
                        
                        <p className="font-semibold mb-2">{issue.message}</p>
                        
                        {issue.original && (
                          <p className="text-sm mb-1">
                            <span className="font-semibold">Found:</span>{' '}
                            <code className="bg-white px-2 py-1 rounded font-mono">{issue.original}</code>
                          </p>
                        )}
                        
                        {issue.suggestion && (
                          <p className="text-sm mb-1">
                            <span className="font-semibold">Suggestion:</span>{' '}
                            <code className="bg-white px-2 py-1 rounded font-mono">{issue.suggestion}</code>
                          </p>
                        )}
                        
                        {issue.found && issue.found !== issue.original && (
                          <p className="text-sm mb-1">
                            <span className="font-semibold">URL:</span>{' '}
                            <a 
                              href={issue.found} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="hover:underline break-all"
                              style={{ color: BRAND.primary }}
                            >
                              {issue.found}
                            </a>
                          </p>
                        )}
                        
                        {issue.link_text && (
                          <p className="text-sm">
                            <span className="font-semibold">Link text:</span> "{issue.link_text}"
                          </p>
                        )}
                        
                        {issue.context && (
                          <p className="text-xs mt-2 p-2 rounded" style={{ 
                            backgroundColor: BRAND.lightGray,
                            color: BRAND.darkGray
                          }}>
                            <span className="font-semibold">Context:</span> {issue.context}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* AI Suggestions */}
            {activeTab === 'issues' && result.suggestions && result.suggestions.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-8 mt-8">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2" style={{ color: BRAND.primary }}>
                  <span>🤖</span> AI Suggestions
                </h2>
                <div className="space-y-3">
                  {result.suggestions.map((suggestion: string, index: number) => (
                    <div 
                      key={index} 
                      className="rounded-lg p-4 border-l-4"
                      style={{ 
                        backgroundColor: BRAND.background,
                        borderColor: BRAND.primary,
                        color: BRAND.darkGray
                      }}
                    >
                      <p>{suggestion}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ⭐ SEO TAB */}
            {activeTab === 'seo' && result.seoAnalysis && (
              <div className="space-y-8">
                {/* SEO Score Overview */}
                <div className="bg-white rounded-2xl shadow-xl p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-3xl font-bold" style={{ color: BRAND.primary }}>
                        SEO Performance Score
                      </h2>
                      <p className="text-sm mt-2" style={{ color: BRAND.darkGray }}>
                        Overall search engine optimization analysis
                      </p>
                    </div>
                    <div className="text-center">
                      <div className={`text-6xl font-bold ${getScoreColor(result.seoAnalysis.overallScore)}`}>
                        {result.seoAnalysis.overallScore}
                      </div>
                      <div className="text-sm" style={{ color: BRAND.darkGray }}>out of 100</div>
                    </div>
                  </div>
                </div>

                {/* Meta Tags Analysis */}
                <div className="bg-white rounded-2xl shadow-xl p-8">
                  <h3 className="text-2xl font-bold mb-6 flex items-center gap-2" style={{ color: BRAND.primary }}>
                    <span>🏷️</span> Meta Tags & Social Media
                  </h3>

                  <div className="space-y-6">
                    {/* Title Tag */}
                    <div className="border-2 rounded-xl p-6" style={{ borderColor: BRAND.lightGray }}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-bold text-lg" style={{ color: BRAND.primary }}>Title Tag</h4>
                          <p className="text-sm" style={{ color: BRAND.darkGray }}>
                            {result.seoAnalysis.title.length} characters • Score: {result.seoAnalysis.title.score}/100
                          </p>
                        </div>
                        <span className={`px-4 py-2 rounded-full font-bold ${
                          result.seoAnalysis.title.score >= 80 ? 'bg-green-100 text-green-700' :
                          result.seoAnalysis.title.score >= 60 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {result.seoAnalysis.title.score >= 80 ? 'Good' : result.seoAnalysis.title.score >= 60 ? 'Fair' : 'Poor'}
                        </span>
                      </div>

                      <div className="rounded-lg p-4 mb-3" style={{ backgroundColor: BRAND.lightGray }}>
                        <p className="font-mono text-sm" style={{ color: BRAND.primary }}>
                          {result.seoAnalysis.title.content || 'No title found'}
                        </p>
                      </div>

                      {result.seoAnalysis.title.issues.length > 0 && (
                        <div className="space-y-2">
                          {result.seoAnalysis.title.issues.map((issue: string, idx: number) => (
                            <div key={idx} className="flex items-start gap-2">
                              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" style={{ color: '#ef4444' }} />
                              <p className="text-sm" style={{ color: BRAND.darkGray }}>{issue}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {result.seoAnalysis.aiSuggestions?.titleSuggestion && (
                        <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: '#dcfce7' }}>
                          <p className="text-sm font-semibold mb-2" style={{ color: '#16a34a' }}>💡 AI Suggestion:</p>
                          <p className="text-sm font-mono" style={{ color: '#15803d' }}>
                            {result.seoAnalysis.aiSuggestions.titleSuggestion}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Meta Description */}
                    <div className="border-2 rounded-xl p-6" style={{ borderColor: BRAND.lightGray }}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-bold text-lg" style={{ color: BRAND.primary }}>Meta Description</h4>
                          <p className="text-sm" style={{ color: BRAND.darkGray }}>
                            {result.seoAnalysis.metaDescription.length} characters • Score: {result.seoAnalysis.metaDescription.score}/100
                          </p>
                        </div>
                        <span className={`px-4 py-2 rounded-full font-bold ${
                          result.seoAnalysis.metaDescription.score >= 80 ? 'bg-green-100 text-green-700' :
                          result.seoAnalysis.metaDescription.score >= 60 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {result.seoAnalysis.metaDescription.score >= 80 ? 'Good' : result.seoAnalysis.metaDescription.score >= 60 ? 'Fair' : 'Poor'}
                        </span>
                      </div>

                      <div className="rounded-lg p-4 mb-3" style={{ backgroundColor: BRAND.lightGray }}>
                        <p className="font-mono text-sm" style={{ color: BRAND.primary }}>
                          {result.seoAnalysis.metaDescription.content || 'No meta description found'}
                        </p>
                      </div>

                      {result.seoAnalysis.metaDescription.issues.length > 0 && (
                        <div className="space-y-2">
                          {result.seoAnalysis.metaDescription.issues.map((issue: string, idx: number) => (
                            <div key={idx} className="flex items-start gap-2">
                              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" style={{ color: '#ef4444' }} />
                              <p className="text-sm" style={{ color: BRAND.darkGray }}>{issue}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {result.seoAnalysis.aiSuggestions?.descriptionSuggestion && (
                        <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: '#dcfce7' }}>
                          <p className="text-sm font-semibold mb-2" style={{ color: '#16a34a' }}>💡 AI Suggestion:</p>
                          <p className="text-sm font-mono" style={{ color: '#15803d' }}>
                            {result.seoAnalysis.aiSuggestions.descriptionSuggestion}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Open Graph & Twitter Cards */}
                    <div className="grid grid-cols-2 gap-6">
                      <div className="border-2 rounded-xl p-6" style={{ borderColor: BRAND.lightGray }}>
                        <h4 className="font-bold text-lg mb-3" style={{ color: BRAND.primary }}>Open Graph Tags</h4>
                        <div className="flex items-center gap-2 mb-3">
                          {result.seoAnalysis.openGraph.present ? (
                            <span className="px-3 py-1 rounded-full text-sm font-bold bg-green-100 text-green-700">
                              ✓ Present
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-sm font-bold bg-red-100 text-red-700">
                              ✗ Missing
                            </span>
                          )}
                          <span className="text-sm" style={{ color: BRAND.darkGray }}>
                            {result.seoAnalysis.openGraph.tags.length} tags
                          </span>
                        </div>
                        {result.seoAnalysis.openGraph.issues.length > 0 && (
                          <div className="space-y-1">
                            {result.seoAnalysis.openGraph.issues.slice(0, 3).map((issue: string, idx: number) => (
                              <p key={idx} className="text-xs" style={{ color: BRAND.darkGray }}>• {issue}</p>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="border-2 rounded-xl p-6" style={{ borderColor: BRAND.lightGray }}>
                        <h4 className="font-bold text-lg mb-3" style={{ color: BRAND.primary }}>Twitter Card</h4>
                        <div className="flex items-center gap-2 mb-3">
                          {result.seoAnalysis.twitterCard.present ? (
                            <span className="px-3 py-1 rounded-full text-sm font-bold bg-green-100 text-green-700">
                              ✓ Present
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-sm font-bold bg-red-100 text-red-700">
                              ✗ Missing
                            </span>
                          )}
                          <span className="text-sm" style={{ color: BRAND.darkGray }}>
                            {result.seoAnalysis.twitterCard.tags.length} tags
                          </span>
                        </div>
                        {result.seoAnalysis.twitterCard.issues.length > 0 && (
                          <div className="space-y-1">
                            {result.seoAnalysis.twitterCard.issues.slice(0, 3).map((issue: string, idx: number) => (
                              <p key={idx} className="text-xs" style={{ color: BRAND.darkGray }}>• {issue}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Schema Markup */}
                <div className="bg-white rounded-2xl shadow-xl p-8">
                  <h3 className="text-2xl font-bold mb-6 flex items-center gap-2" style={{ color: BRAND.primary }}>
                    <span>📊</span> Schema Markup (Structured Data)
                  </h3>

                  <div className="mb-6">
                    <div className="flex items-center gap-4 mb-4">
                      {result.seoAnalysis.schemas.found ? (
                        <>
                          <span className="px-6 py-3 rounded-full text-lg font-bold bg-green-100 text-green-700">
                            ✓ Schema Found
                          </span>
                          <span className="text-lg font-semibold" style={{ color: BRAND.darkGray }}>
                            {result.seoAnalysis.schemas.count} schema{result.seoAnalysis.schemas.count > 1 ? 's' : ''} detected
                          </span>
                        </>
                      ) : (
                        <span className="px-6 py-3 rounded-full text-lg font-bold bg-red-100 text-red-700">
                          ✗ No Schema Found
                        </span>
                      )}
                    </div>

                    {result.seoAnalysis.schemas.types.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {result.seoAnalysis.schemas.types.map((type: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-4 py-2 rounded-lg font-semibold"
                            style={{ backgroundColor: BRAND.background, color: BRAND.primary }}
                          >
                            {type}
                          </span>
                        ))}
                      </div>
                    )}

                    {result.seoAnalysis.schemas.issues.length > 0 && (
                      <div className="space-y-2">
                        {result.seoAnalysis.schemas.issues.map((issue: string, idx: number) => (
                          <div key={idx} className="flex items-start gap-2">
                            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" style={{ color: '#f59e0b' }} />
                            <p className="text-sm" style={{ color: BRAND.darkGray }}>{issue}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {result.seoAnalysis.aiSuggestions?.schemaSuggestions && result.seoAnalysis.aiSuggestions.schemaSuggestions.length > 0 && (
                    <div className="p-6 rounded-xl" style={{ backgroundColor: '#dbeafe' }}>
                      <h4 className="font-bold mb-3 flex items-center gap-2" style={{ color: '#1e40af' }}>
                        <span>💡</span> AI Schema Recommendations
                      </h4>
                      <div className="space-y-2">
                        {result.seoAnalysis.aiSuggestions.schemaSuggestions.map((suggestion: string, idx: number) => (
                          <p key={idx} className="text-sm" style={{ color: '#1e40af' }}>
                            • {suggestion}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Technical SEO */}
                <div className="bg-white rounded-2xl shadow-xl p-8">
                  <h3 className="text-2xl font-bold mb-6 flex items-center gap-2" style={{ color: BRAND.primary }}>
                    <span>⚙️</span> Technical SEO
                  </h3>

                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div className="border-2 rounded-xl p-4" style={{ borderColor: BRAND.lightGray }}>
                      <div className="text-sm font-semibold mb-2" style={{ color: BRAND.darkGray }}>Canonical URL</div>
                      <div className="flex items-center gap-2">
                        {result.seoAnalysis.technical.canonical ? (
                          <>
                            <CheckCircle size={20} className="text-green-600" />
                            <span className="text-xs font-mono break-all" style={{ color: BRAND.darkGray }}>
                              {result.seoAnalysis.technical.canonical}
                            </span>
                          </>
                        ) : (
                          <>
                            <X size={20} className="text-red-600" />
                            <span className="text-sm" style={{ color: BRAND.darkGray }}>Not set</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="border-2 rounded-xl p-4" style={{ borderColor: BRAND.lightGray }}>
                      <div className="text-sm font-semibold mb-2" style={{ color: BRAND.darkGray }}>Robots Meta</div>
                      <div className="flex items-center gap-2">
                        {result.seoAnalysis.technical.robots ? (
                          <>
                            <AlertCircle size={20} style={{ color: '#f59e0b' }} />
                            <span className="text-sm" style={{ color: BRAND.darkGray }}>
                              {result.seoAnalysis.technical.robots}
                            </span>
                          </>
                        ) : (
                          <>
                            <CheckCircle size={20} className="text-green-600" />
                            <span className="text-sm" style={{ color: BRAND.darkGray }}>Indexable</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="border-2 rounded-xl p-4" style={{ borderColor: BRAND.lightGray }}>
                      <div className="text-sm font-semibold mb-2" style={{ color: BRAND.darkGray }}>Viewport Meta</div>
                      <div className="flex items-center gap-2">
                        {result.seoAnalysis.technical.viewport ? (
                          <>
                            <CheckCircle size={20} className="text-green-600" />
                            <span className="text-sm" style={{ color: BRAND.darkGray }}>Mobile-friendly</span>
                          </>
                        ) : (
                          <>
                            <X size={20} className="text-red-600" />
                            <span className="text-sm" style={{ color: BRAND.darkGray }}>Missing</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="border-2 rounded-xl p-4" style={{ borderColor: BRAND.lightGray }}>
                      <div className="text-sm font-semibold mb-2" style={{ color: BRAND.darkGray }}>Language Tag</div>
                      <div className="flex items-center gap-2">
                        {result.seoAnalysis.technical.language ? (
                          <>
                            <CheckCircle size={20} className="text-green-600" />
                            <span className="text-sm font-mono" style={{ color: BRAND.darkGray }}>
                              {result.seoAnalysis.technical.language}
                            </span>
                          </>
                        ) : (
                          <>
                            <X size={20} className="text-red-600" />
                            <span className="text-sm" style={{ color: BRAND.darkGray }}>Not set</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {result.seoAnalysis.technical.issues.length > 0 && (
                    <div>
                      <h4 className="font-bold mb-3" style={{ color: BRAND.primary }}>Technical Issues Found</h4>
                      <div className="space-y-2">
                        {result.seoAnalysis.technical.issues.map((issue: any, idx: number) => (
                          <div
                            key={idx}
                            className={`p-3 rounded-lg border-l-4 ${getSeverityColor(issue.severity)}`}
                          >
                            <p className="text-sm font-semibold">{issue.message}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Headings & Content Structure */}
                <div className="bg-white rounded-2xl shadow-xl p-8">
                  <h3 className="text-2xl font-bold mb-6 flex items-center gap-2" style={{ color: BRAND.primary }}>
                    <span>📑</span> Content Structure
                  </h3>

                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div>
                      <h4 className="font-bold mb-3" style={{ color: BRAND.primary }}>H1 Headings</h4>
                      {result.seoAnalysis.headings.h1.length > 0 ? (
                        <div className="space-y-2">
                          {result.seoAnalysis.headings.h1.map((h1: string, idx: number) => (
                            <div key={idx} className="p-3 rounded-lg" style={{ backgroundColor: BRAND.lightGray }}>
                              <p className="text-sm font-semibold" style={{ color: BRAND.primary }}>{h1}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 rounded-lg bg-red-50">
                          <p className="text-sm text-red-700">No H1 heading found</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="font-bold mb-3" style={{ color: BRAND.primary }}>Heading Distribution</h4>
                      <div className="space-y-2">
                        {['h2', 'h3', 'h4', 'h5', 'h6'].map((tag) => (
                          <div key={tag} className="flex items-center justify-between p-2 rounded" style={{ backgroundColor: BRAND.lightGray }}>
                            <span className="font-mono text-sm font-bold" style={{ color: BRAND.primary }}>{tag.toUpperCase()}</span>
                            <span className="text-sm" style={{ color: BRAND.darkGray }}>
                              {result.seoAnalysis.headings[`${tag}Count`]} tag{result.seoAnalysis.headings[`${tag}Count`] !== 1 ? 's' : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {result.seoAnalysis.headings.issues.length > 0 && (
                    <div>
                      <h4 className="font-bold mb-3" style={{ color: BRAND.primary }}>Structure Issues</h4>
                      <div className="space-y-2">
                        {result.seoAnalysis.headings.issues.map((issue: any, idx: number) => (
                          <div
                            key={idx}
                            className={`p-3 rounded-lg border-l-4 ${getSeverityColor(issue.severity)}`}
                          >
                            <p className="text-sm font-semibold">{issue.message}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Images & Links */}
                <div className="bg-white rounded-2xl shadow-xl p-8">
                  <h3 className="text-2xl font-bold mb-6 flex items-center gap-2" style={{ color: BRAND.primary }}>
                    <span>🖼️</span> Images & Links
                  </h3>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="border-2 rounded-xl p-6" style={{ borderColor: BRAND.lightGray }}>
                      <h4 className="font-bold text-lg mb-4" style={{ color: BRAND.primary }}>Images</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm" style={{ color: BRAND.darkGray }}>Total Images</span>
                          <span className="font-bold text-xl" style={{ color: BRAND.primary }}>
                            {result.seoAnalysis.images.total}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm" style={{ color: BRAND.darkGray }}>Missing Alt Text</span>
                          <span className={`font-bold text-xl ${result.seoAnalysis.images.withoutAlt > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {result.seoAnalysis.images.withoutAlt}
                          </span>
                        </div>
                        {result.seoAnalysis.images.total > 0 && (
                          <div className="pt-3 border-t">
                            <div className="text-xs mb-1" style={{ color: BRAND.darkGray }}>Alt Text Coverage</div>
                            <div className="w-full h-3 rounded-full overflow-hidden" style={{ backgroundColor: BRAND.lightGray }}>
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  backgroundColor: result.seoAnalysis.images.withoutAlt === 0 ? '#16a34a' : '#ef4444',
                                  width: `${((result.seoAnalysis.images.total - result.seoAnalysis.images.withoutAlt) / result.seoAnalysis.images.total) * 100}%`
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="border-2 rounded-xl p-6" style={{ borderColor: BRAND.lightGray }}>
                      <h4 className="font-bold text-lg mb-4" style={{ color: BRAND.primary }}>Links</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm" style={{ color: BRAND.darkGray }}>Internal Links</span>
                          <span className="font-bold text-xl" style={{ color: BRAND.primary }}>
                            {result.seoAnalysis.links.internal}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm" style={{ color: BRAND.darkGray }}>External Links</span>
                          <span className="font-bold text-xl" style={{ color: BRAND.primary }}>
                            {result.seoAnalysis.links.external}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm" style={{ color: BRAND.darkGray }}>Nofollow Links</span>
                          <span className="font-bold text-xl" style={{ color: BRAND.darkGray }}>
                            {result.seoAnalysis.links.nofollow}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Keyword Opportunities */}
                {result.seoAnalysis.aiSuggestions?.keywordOpportunities && result.seoAnalysis.aiSuggestions.keywordOpportunities.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-xl p-8">
                    <h3 className="text-2xl font-bold mb-6 flex items-center gap-2" style={{ color: BRAND.primary }}>
                      <span>🔑</span> Keyword Opportunities
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {result.seoAnalysis.aiSuggestions.keywordOpportunities.map((keyword: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-6 py-3 rounded-xl font-semibold text-white shadow-lg"
                          style={{ backgroundColor: BRAND.primary }}
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Content Suggestions */}
                {result.seoAnalysis.aiSuggestions?.contentSuggestions && result.seoAnalysis.aiSuggestions.contentSuggestions.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-xl p-8">
                    <h3 className="text-2xl font-bold mb-6 flex items-center gap-2" style={{ color: BRAND.primary }}>
                      <span>💡</span> AI Content Recommendations
                    </h3>
                    <div className="space-y-3">
                      {result.seoAnalysis.aiSuggestions.contentSuggestions.map((suggestion: string, idx: number) => (
                        <div
                          key={idx}
                          className="rounded-lg p-4 border-l-4"
                          style={{
                            backgroundColor: BRAND.background,
                            borderColor: BRAND.primary,
                          }}
                        >
                          <p style={{ color: BRAND.darkGray }}>{suggestion}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
