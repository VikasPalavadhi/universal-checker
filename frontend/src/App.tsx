import { useState, useRef, useEffect } from 'react';
import { Upload, CheckCircle, AlertCircle, Loader2, Filter, X, Globe, Languages } from 'lucide-react';
import axios from 'axios';

// Use environment variable or fallback to relative URL for production
const API_URL = import.meta.env.VITE_API_URL || '/api';

// 🎨 BRAND COLORS
const BRAND = {
  primary: '#072447',      // Dark blue
  background: '#eef2f8',   // Light blue/gray
  white: '#ffffff',
  lightGray: '#f5f7fa',
  darkGray: '#6b7280',
};

// Loading steps for the interactive popup
const LOADING_STEPS = [
 // { id: 1, label: 'Uploading file...', icon: '📤', duration: 1000 },
  { id: 1, label: 'Extracting text content...', icon: '📄', duration: 1500 },
  { id: 2, label: 'Analyzing content quality...', icon: '🔍', duration: 2000 },
  { id: 3, label: 'Checking brand compliance...', icon: '🏷️', duration: 1500 },
  { id: 4, label: 'Validating all links...', icon: '🔗', duration: 2000 },
  { id: 5, label: 'Scanning for issues...', icon: '🔎', duration: 2000 },
  { id: 6, label: 'Generating final report...', icon: '📊', duration: 1000 },
];

function App() {
  const [file, setFile] = useState<File | null>(null);
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
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to check file');
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
            <h2 className="text-2xl font-semibold mb-6" style={{ color: BRAND.primary }}>
              Upload Your Content
            </h2>
            
            <div 
              className="border-2 border-dashed rounded-xl p-8 text-center transition-colors"
              style={{ 
                borderColor: file ? BRAND.primary : '#d1d5db',
                backgroundColor: file ? BRAND.background : BRAND.white
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

            {/* Extracted Text Preview */}
            {result.extractedText && (
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
            {result.metrics.totalIssues > 0 && (
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
            {result.suggestions && result.suggestions.length > 0 && (
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
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
