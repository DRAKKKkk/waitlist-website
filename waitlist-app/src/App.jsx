import { useState, useEffect } from 'react';
import { platformOptions } from './platforms'; 
import { companyOptions } from './companies'; 
import { Turnstile } from '@marsidev/react-turnstile'; 

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function App() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    profession: '',
    company: '', 
  });

  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [platformInput, setPlatformInput] = useState('');
  const [isPlatformOpen, setIsPlatformOpen] = useState(false);
  
  const [companyInput, setCompanyInput] = useState('');
  const [isCompanyOpen, setIsCompanyOpen] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState(null);

  // Referral States
  const [referredBy, setReferredBy] = useState(null);
  const [myRefCode, setMyRefCode] = useState('');
  const [copied, setCopied] = useState(false);

  // Profession Dropdown States
  const [isProfessionOpen, setIsProfessionOpen] = useState(false);
  const professionOptions = ['Student', 'Freelancer', 'Working Professional', 'Other'];

  useEffect(() => {
    if (localStorage.getItem('intelli_joined') === 'true') {
      setHasJoined(true);
      setMyRefCode(localStorage.getItem('intelli_ref_code') || '');
    }

    const urlParams = new URLSearchParams(window.location.search);
    const refParam = urlParams.get('ref');
    if (refParam) {
      setReferredBy(refParam);
    }
  }, []);

  const filteredPlatforms = platformOptions
    .filter(p => 
      p.toLowerCase().includes(platformInput.toLowerCase()) && 
      !selectedPlatforms.includes(p)
    )
    .slice(0, 50);

  const filteredCompanies = companyOptions
    .filter(c => 
      c.toLowerCase().includes(companyInput.toLowerCase())
    )
    .slice(0, 50); 

  // const [submissions, setSubmissions] = useState([]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const addCompany = (companyName) => {
    const trimmedName = companyName.trim();
    if (!trimmedName) return;
    setFormData(prev => ({ ...prev, company: trimmedName }));
    setCompanyInput('');
    setIsCompanyOpen(false);
  };

  const handleCompanyKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); 
      if (isCompanyOpen && filteredCompanies.length > 0) {
        addCompany(filteredCompanies[0]);
      } else {
        addCompany(companyInput);
      }
    }
  };

  const removeCompany = () => {
    setFormData(prev => ({ ...prev, company: '' }));
  };

  const addPlatform = (platformName) => {
    const trimmedName = platformName.trim();
    if (!trimmedName) return;
    if (selectedPlatforms.length >= 10) {
      alert('Maximum limit reached.');
      return;
    }
    if (!selectedPlatforms.includes(trimmedName)) {
      setSelectedPlatforms([...selectedPlatforms, trimmedName]);
    }
    setPlatformInput('');
    setIsPlatformOpen(false);
  };

  const handlePlatformKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); 
      if (isPlatformOpen && filteredPlatforms.length > 0) {
        addPlatform(filteredPlatforms[0]);
      } else {
        addPlatform(platformInput);
      }
    }
  };

  const removePlatform = (platformName) => {
    setSelectedPlatforms(selectedPlatforms.filter(p => p !== platformName));
  };

  const copyToClipboard = () => {
    const link = `${window.location.origin}?ref=${myRefCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.firstName || !formData.email || !formData.profession || selectedPlatforms.length === 0) {
      alert('Please fill all required fields and select at least one platform.');
      return;
    }
    if (formData.profession === 'Working Professional' && !formData.company) {
      alert('Please input your company name.');
      return;
    }
    if (!turnstileToken) {
      alert('Anti-bot verification is still loading or failed. Please wait a second and try again.');
      return;
    }

    setIsSubmitting(true); 

    try {
      const response = await fetch(`${API_URL}/api/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          profession: formData.profession,
          company: formData.company,
          platforms: selectedPlatforms,
          turnstileToken: turnstileToken,
          referredBy: referredBy
        })
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('intelli_joined', 'true');
        localStorage.setItem('intelli_ref_code', data.user.referral_code);
        setMyRefCode(data.user.referral_code);
        setHasJoined(true);
      } else if (response.status === 409) {
        alert('This email is already registered in our database.');
      } else {
        alert(`Warning: ${data.error}`);
      }
    } catch (error) {
      console.error("Connection failed", error);
      alert('Server unreachable. Try again later.');
    } finally {
      setIsSubmitting(false); 
    }
  };

  const closeAllMenus = () => {
    setIsPlatformOpen(false);
    setIsCompanyOpen(false);
    setIsProfessionOpen(false); 
  };

  const ChevronIcon = () => (
    <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
    </svg>
  );

  const CloseIcon = () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );

  // ==========================================
  // UNIVERSAL-GLASS SUCCESS SCREEN
  // ==========================================
  if (hasJoined) {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center py-12 px-6 font-sans text-zinc-100 selection:bg-blue-500/30">
        {/* Background Glow Effect */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px]" />
        </div>

        <main className="max-w-xl w-full flex flex-col items-center bg-zinc-900/80 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.3)] p-10 z-10 relative text-center">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-100">
            You're on the list.
          </h2>
          <p className="text-zinc-400 text-base mt-4 leading-relaxed">
            Thank you for securing your spot. You will be one of the first to experience <span className="text-zinc-100 font-medium">IntelliGuide</span>.
          </p>

          <div className="w-full bg-black/20 border border-white/10 rounded-xl p-6 mt-8">
            <p className="text-sm font-medium text-zinc-300 mb-3">
              Move up the queue. Share this link with friends:
            </p>
            <div className="flex items-center justify-between bg-black/40 border border-white/10 rounded-lg p-2">
              <code className="text-blue-400 text-sm truncate pl-3 pr-4">
                {window.location.origin}?ref={myRefCode}
              </code>
              <button 
                onClick={copyToClipboard}
                className="text-xs bg-white/10 hover:bg-white/20 text-zinc-100 font-medium px-4 py-2 rounded-md transition-all duration-200 flex-shrink-0"
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ==========================================
  // UNIVERSAL-GLASS MAIN FORM
  // ==========================================
  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans text-zinc-100 selection:bg-blue-500/30" onClick={closeAllMenus}>
      
      {/* Background Ambient Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 flex justify-center items-center">
        <div className="absolute top-0 w-full h-[500px] bg-blue-600/10 blur-[150px] rounded-[100%]" />
      </div>

      <div className="max-w-2xl w-full flex flex-col items-center z-10">
        
        <div className="text-center mb-10 max-w-xl">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-zinc-100 mb-5">
            We know when you're lost.
          </h1>
          <p className="text-base text-zinc-400 leading-relaxed">
            What if your software knew you were confused before you even typed a single question? IntelliGuide is an invisible layer that turns hesitation into instant clarity.
          </p>
        </div>

        {/* Glassmorphism Card */}
        <main className="w-full bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.3)] p-6 sm:p-10 relative">
          
          <form onSubmit={handleSubmit} className="w-full space-y-6" onClick={(e) => e.stopPropagation()}>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex flex-col">
                <label className="text-xs font-medium text-zinc-400 mb-2 ml-1">First Name <span className="text-blue-500">*</span></label>
                <input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} required disabled={isSubmitting}
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all duration-200 disabled:opacity-50" 
                  placeholder="Steve" />
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-medium text-zinc-400 mb-2 ml-1">Last Name</label>
                <input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} disabled={isSubmitting}
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all duration-200 disabled:opacity-50" 
                  placeholder="Jobs" />
              </div>
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-medium text-zinc-400 mb-2 ml-1">Work Email <span className="text-blue-500">*</span></label>
              <input type="email" name="email" value={formData.email} onChange={handleInputChange} required disabled={isSubmitting}
                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all duration-200 disabled:opacity-50" 
                placeholder="steve@apple.com" />
            </div>

            {/* Custom Dropdown: Profession */}
            <div className="flex flex-col relative">
              <label className="text-xs font-medium text-zinc-400 mb-2 ml-1">Current Role <span className="text-blue-500">*</span></label>
              
              <div 
                onClick={() => {
                  if (!isSubmitting) {
                    setIsProfessionOpen(!isProfessionOpen);
                    setIsCompanyOpen(false);
                    setIsPlatformOpen(false);
                  }
                }}
                className={`w-full bg-black/20 border ${isProfessionOpen ? 'border-blue-500 ring-1 ring-blue-500/50' : 'border-white/10'} rounded-lg px-4 py-3 text-sm flex justify-between items-center transition-all duration-200 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-black/30'}`}
              >
                <span className={formData.profession ? 'text-zinc-100' : 'text-zinc-500'}>
                  {formData.profession || 'Select your profession...'}
                </span>
                <span className={`transform transition-transform duration-200 ${isProfessionOpen ? 'rotate-180' : ''}`}>
                  <ChevronIcon />
                </span>
              </div>

              {isProfessionOpen && !isSubmitting && (
                <div className="absolute top-full mt-2 left-0 w-full bg-zinc-800/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-[0_10px_30px_rgba(0,0,0,0.5)] overflow-hidden z-30 py-1">
                  {professionOptions.map((role) => (
                    <div
                      key={role}
                      onClick={() => {
                        setFormData(prev => ({ ...prev, profession: role }));
                        setIsProfessionOpen(false);
                      }}
                      className="px-4 py-2.5 text-sm text-zinc-300 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors"
                    >
                      {role}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Conditional Company Input */}
            {formData.profession === 'Working Professional' && (
              <div className="flex flex-col relative animate-fade-in">
                <label className="text-xs font-medium text-zinc-400 mb-2 ml-1">Company Name <span className="text-blue-500">*</span></label>
                
                {formData.company ? (
                  <div className="flex items-center mt-1">
                    <div className="flex items-center text-sm bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-md px-3 py-1.5 shadow-sm">
                      <span className="font-medium">{formData.company}</span>
                      <button 
                        type="button" 
                        onClick={removeCompany}
                        className="ml-3 text-blue-400/60 hover:text-red-400 transition-colors focus:outline-none p-0.5 rounded-full hover:bg-red-400/10"
                      >
                        <CloseIcon />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative w-full">
                    <input 
                      type="text" 
                      placeholder="Search or type company name..."
                      value={companyInput}
                      onChange={(e) => {
                        setCompanyInput(e.target.value);
                        setIsCompanyOpen(true);
                        setIsProfessionOpen(false);
                      }}
                      onFocus={() => setIsCompanyOpen(true)}
                      onClick={() => setIsCompanyOpen(true)}
                      onKeyDown={handleCompanyKeyDown}
                      disabled={isSubmitting}
                      autoComplete="off"
                      className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all duration-200 disabled:opacity-50 pr-10" 
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                      <ChevronIcon />
                    </div>
                  </div>
                )}
                
                {isCompanyOpen && !formData.company && (
                  <div className="absolute top-full mt-2 left-0 w-full bg-zinc-800/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-[0_10px_30px_rgba(0,0,0,0.5)] max-h-48 overflow-y-auto z-20 py-1 custom-scrollbar">
                    {filteredCompanies.length > 0 ? (
                      filteredCompanies.map((comp, idx) => (
                        <div key={idx} onClick={() => addCompany(comp)}
                          className="px-4 py-2.5 text-sm text-zinc-300 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors">
                          {comp}
                        </div>
                      ))
                    ) : (
                      companyInput.trim() !== '' ? (
                        <div 
                          className="px-4 py-2.5 text-sm text-blue-400 cursor-pointer hover:bg-blue-500/10 font-medium"
                          onClick={() => addCompany(companyInput)}
                        >
                          Press Enter to add "{companyInput}"
                        </div>
                      ) : (
                        <div className="px-4 py-2.5 text-sm text-zinc-500 italic">
                          No suggestions found
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Platform Integration Input */}
            <div className="flex flex-col relative">
              <label className="text-xs font-medium text-zinc-400 mb-2 ml-1 flex justify-between items-center">
                <span>Tools you use the most <span className="text-blue-500">*</span></span>
                <span className="text-zinc-600 font-normal">Max 10</span>
              </label>

              {selectedPlatforms.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3 mt-1">
                  {selectedPlatforms.map((plat, idx) => (
                    <div key={idx} className="flex items-center text-xs bg-zinc-800 border border-white/10 text-zinc-200 rounded-md px-2.5 py-1.5 shadow-sm">
                      <span className="font-medium">{plat}</span>
                      <button 
                        type="button" 
                        onClick={() => removePlatform(plat)}
                        className="ml-2 text-zinc-500 hover:text-red-400 transition-colors focus:outline-none bg-white/5 hover:bg-red-400/10 rounded-full p-0.5"
                      >
                        <CloseIcon />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="relative w-full">
                <input 
                  type="text" 
                  placeholder={selectedPlatforms.length >= 10 ? "Limit reached" : "e.g. Notion, Slack, Jira..."}
                  value={platformInput}
                  onChange={(e) => {
                    setPlatformInput(e.target.value);
                    setIsPlatformOpen(true);
                    setIsProfessionOpen(false);
                  }}
                  onFocus={() => setIsPlatformOpen(true)}
                  onClick={() => setIsPlatformOpen(true)}
                  onKeyDown={handlePlatformKeyDown}
                  disabled={selectedPlatforms.length >= 10 || isSubmitting}
                  autoComplete="off"
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all duration-200 disabled:opacity-50 pr-10" 
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <ChevronIcon />
                </div>
              </div>
              
              {isPlatformOpen && selectedPlatforms.length < 10 && (
                <div className="absolute top-full mt-2 left-0 w-full bg-zinc-800/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-[0_10px_30px_rgba(0,0,0,0.5)] max-h-48 overflow-y-auto z-10 py-1 custom-scrollbar">
                  {filteredPlatforms.length > 0 ? (
                    filteredPlatforms.map((plat, idx) => (
                      <div key={idx} onClick={() => addPlatform(plat)}
                        className="px-4 py-2.5 text-sm text-zinc-300 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors">
                        {plat}
                      </div>
                    ))
                  ) : (
                    platformInput.trim() !== '' ? (
                      <div 
                        className="px-4 py-2.5 text-sm text-blue-400 cursor-pointer hover:bg-blue-500/10 font-medium"
                        onClick={() => addPlatform(platformInput)}
                      >
                        Press Enter to add "{platformInput}"
                      </div>
                    ) : (
                      <div className="px-4 py-2.5 text-sm text-zinc-500 italic">
                        No platforms found
                      </div>
                    )
                  )}
                </div>
              )}
            </div>

            {/* Turnstile */}
            <div className="pt-2 flex justify-center w-full overflow-hidden rounded-lg">
              <Turnstile 
                siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY} 
                onSuccess={(token) => setTurnstileToken(token)}
                onError={() => alert('Cloudflare validation failed.')}
                options={{ theme: 'dark' }}
              />
            </div>

            {/* Submit Button */}
            <div className="w-full pt-4">
              <button type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center px-8 py-3.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-500 hover:-translate-y-[1px] shadow-[0_4px_14px_0_rgba(59,130,246,0.39)] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0">
                {isSubmitting ? 'Processing...' : 'Request Early Access'}
              </button>
            </div>
          </form>

          {/* Connected Users Log (Sleek Glass Version) 
          <div className="mt-10 pt-6 border-t border-white/10">
            <div className="flex items-center justify-between text-xs text-zinc-500 mb-4 font-medium uppercase tracking-wider">
              <span>Waitlist Queue</span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                {submissions.length} Waiting
              </span>
            </div>
          
            
            <div className="space-y-1 h-32 overflow-y-auto custom-scrollbar pr-2">
              {submissions.map((user) => (
                <div key={user.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0 text-sm">
                  <span className="text-zinc-300 font-medium">{user.firstName}</span>
                  <span className="text-zinc-600 text-xs font-medium">Joined</span>
                </div>
              ))}
              <div className="flex items-center py-2 text-sm">
                <span className="text-zinc-500 animate-pulse font-medium">You are next...</span>
              </div>
            </div>
          </div>
          */}
          
        </main>
      </div>
    </div>
  );
}