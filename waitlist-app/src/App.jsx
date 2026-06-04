import { useState, useEffect } from 'react';
import { platformOptions } from './platforms'; 
import { companyOptions } from './companies'; 
import { Turnstile } from '@marsidev/react-turnstile'; 

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

  // > NEW: Referral States
  const [referredBy, setReferredBy] = useState(null);
  const [myRefCode, setMyRefCode] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // 1. Check if user already joined
    if (localStorage.getItem('intelli_joined') === 'true') {
      setHasJoined(true);
      setMyRefCode(localStorage.getItem('intelli_ref_code') || '');
    }

    // 2. Scan URL for friend's referral code (e.g., ?ref=tejas123)
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

  const [submissions, setSubmissions] = useState([]);

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
      // Agar suggestions list mein kuch hai, toh pehla option select karo
      if (isCompanyOpen && filteredCompanies.length > 0) {
        addCompany(filteredCompanies[0]);
      } else {
        // Warna jo type kiya hai wahi select kar lo
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
      alert('[ SYSTEM_MSG ]: Maximum limit reached.');
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
      // Agar suggestions list mein kuch hai, toh pehla option select karo
      if (isPlatformOpen && filteredPlatforms.length > 0) {
        addPlatform(filteredPlatforms[0]);
      } else {
        // Warna jo type kiya hai wahi select kar lo
        addPlatform(platformInput);
      }
    }
  };

  const removePlatform = (platformName) => {
    setSelectedPlatforms(selectedPlatforms.filter(p => p !== platformName));
  };

  // > NEW: Copy to Clipboard Function
  const copyToClipboard = () => {
    const link = `${window.location.origin}?ref=${myRefCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.firstName || !formData.email || !formData.profession || selectedPlatforms.length === 0) {
      alert('[ SYSTEM_ERROR ]: Please fill all required fields and select at least one platform.');
      return;
    }
    if (formData.profession === 'Working Professional' && !formData.company) {
      alert('[ SYSTEM_ERROR ]: Please input your company name.');
      return;
    }
    if (!turnstileToken) {
      alert('[ SECURITY_ALERT ]: Anti-bot verification is still loading or failed. Please wait a second and try again.');
      return;
    }

    setIsSubmitting(true); 

    try {
      const response = await fetch('http://localhost:5000/api/join', {
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
          referredBy: referredBy // > NEW: Sending refer code to backend
        })
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('intelli_joined', 'true');
        // > NEW: Save my referral code locally
        localStorage.setItem('intelli_ref_code', data.user.referral_code);
        setMyRefCode(data.user.referral_code);
        setHasJoined(true);
      } else if (response.status === 409) {
        alert('[ SYSTEM_WARNING ]: This email is already registered in our database.');
      } else {
        alert(`[ SYSTEM_WARNING ]: ${data.error}`);
      }
    } catch (error) {
      console.error("Connection failed", error);
      alert('[ SYSTEM_CRITICAL ]: Server unreachable. Try again later.');
    } finally {
      setIsSubmitting(false); 
    }
  };

  const closeAllMenus = () => {
    setIsPlatformOpen(false);
    setIsCompanyOpen(false);
  };

  // ==========================================
  // UPDATED SUCCESS SCREEN WITH REFERRAL LOOP
  // ==========================================
  if (hasJoined) {
    return (
      <div className="min-h-screen bg-[#121212] flex flex-col items-center justify-center py-12 px-6 font-mono selection:bg-[#00ffcc] selection:text-black">
        <div className="max-w-xl w-full text-center space-y-8 animate-fade-in border-t border-b border-gray-800 py-12">
          
          <div>
            <h2 className="text-[#00ffcc] text-2xl md:text-3xl font-bold tracking-widest uppercase">
              [ THANK_YOU ]
            </h2>
            <p className="text-gray-400 text-base md:text-lg leading-relaxed mt-4">
              Thank you for adding your name. <br className="hidden md:block"/>
              You are going to be one of the early users of <span className="text-white font-bold tracking-wide">IntelliGuide</span>.
            </p>
          </div>

          <div className="bg-black/50 p-6 border border-gray-800 mt-8 space-y-4">
            
            <p className="text-sm text-gray-300">
              Share this unique link with 3 friends.
            </p>
            
            <div className="flex items-center justify-between bg-[#1a1a1a] border border-[#00ffcc]/30 p-3 mt-4">
              <code className="text-[#00ffcc] text-sm truncate mr-4">
                {window.location.origin}?ref={myRefCode}
              </code>
              <button 
                onClick={copyToClipboard}
                className="text-xs bg-[#00ffcc] text-black font-bold px-3 py-1.5 uppercase tracking-wider hover:bg-white transition-colors flex-shrink-0"
              >
                {copied ? 'COPIED!' : 'COPY'}
              </button>
            </div>
          </div>

          <p className="text-gray-600 text-xs mt-10 uppercase tracking-widest animate-pulse">
            _ SYSTEM_STANDBY
          </p>
        </div>
      </div>
    );
  }

  // ==========================================
  // MAIN FORM CODE (REMAINS EXACTLY THE SAME)
  // ==========================================
  return (
    <div className="min-h-screen bg-[#121212] flex flex-col items-center py-12 px-6 font-mono text-gray-300 selection:bg-[#00ffcc] selection:text-black" onClick={closeAllMenus}>
      
      <main className="max-w-3xl w-full flex flex-col items-center">
        
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tighter text-white mb-6 text-center leading-tight">
          WE KNOW WHEN YOU'RE LOST.
        </h1>
        
        <div className="text-sm md:text-base text-gray-400 mb-12 text-center leading-relaxed space-y-4 max-w-xl">
          <p>
            What if your software knew you were confused before you even typed a single question? <span className="text-[#00ffcc] font-bold tracking-wide">IntelliGuide</span> is an invisible layer that detects friction and turns hesitation into instant clarity—precisely on the UI element where you need it. 
          </p>
          <p className="font-semibold text-gray-300">
            No searching. No context-switching.
          </p>
          <p className="text-xs text-gray-500 uppercase tracking-widest pt-3">
            [ The end of frustrating interfaces is imminent ]
          </p>
        </div>

        <form onSubmit={handleSubmit} className="w-full max-w-xl space-y-8" onClick={(e) => e.stopPropagation()}>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex flex-col">
              <label className="text-xs md:text-sm text-gray-500 uppercase tracking-widest mb-2">First Name *</label>
              <input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} required disabled={isSubmitting}
                className="w-full bg-transparent border-0 border-b border-solid border-gray-600 pb-2 text-base text-white placeholder-gray-600 focus:ring-0 focus:outline-none focus:border-[#00ffcc] transition-colors rounded-none appearance-none disabled:opacity-50" />
            </div>
            <div className="flex flex-col">
              <label className="text-xs md:text-sm text-gray-500 uppercase tracking-widest mb-2">Last Name</label>
              <input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} disabled={isSubmitting}
                className="w-full bg-transparent border-0 border-b border-solid border-gray-600 pb-2 text-base text-white placeholder-gray-600 focus:ring-0 focus:outline-none focus:border-[#00ffcc] transition-colors rounded-none appearance-none disabled:opacity-50" />
            </div>
          </div>

          <div className="flex flex-col">
            <label className="text-xs md:text-sm text-gray-500 uppercase tracking-widest mb-2">Email Address *</label>
            <input type="email" name="email" value={formData.email} onChange={handleInputChange} required disabled={isSubmitting}
              className="w-full bg-transparent border-0 border-b border-solid border-gray-600 pb-2 text-base text-white placeholder-gray-600 focus:ring-0 focus:outline-none focus:border-[#00ffcc] transition-colors rounded-none appearance-none disabled:opacity-50" />
          </div>

          <div className="flex flex-col relative">
            <label className="text-xs md:text-sm text-gray-500 uppercase tracking-widest mb-2">Profession *</label>
            <select 
              name="profession" 
              value={formData.profession} 
              onChange={handleInputChange} 
              required
              disabled={isSubmitting}
              className={`w-full bg-transparent border-0 border-b border-solid border-gray-600 pb-2 text-base focus:ring-0 focus:outline-none focus:border-[#00ffcc] transition-colors rounded-none appearance-none cursor-pointer disabled:opacity-50 ${formData.profession === '' ? 'text-gray-500' : 'text-white'}`}
            >
              <option value="" disabled className="text-gray-500 bg-[#121212]">[ SELECT_ROLE ]</option>
              <option value="Student" className="text-gray-400 bg-[#121212]">Student</option>
              <option value="Freelancer" className="text-gray-400 bg-[#121212]">Freelancer</option>
              <option value="Working Professional" className="text-gray-400 bg-[#121212]">Working Professional</option>
              <option value="Other" className="text-gray-400 bg-[#121212]">Other</option>
            </select>
            <span className="absolute right-0 bottom-3 text-gray-500 pointer-events-none text-xs">
              [ ▼ ]
            </span>
          </div>

          {formData.profession === 'Working Professional' && (
            <div className="flex flex-col relative animate-fade-in">
              <label className="text-xs md:text-sm text-[#00ffcc] uppercase tracking-widest mb-2">Company Name *</label>
              
              {formData.company && (
                <div className="flex flex-wrap gap-2 mt-1">
                  <div className="flex items-center text-xs bg-black border border-solid border-[#00ffcc]/50 text-[#00ffcc] px-2 py-1">
                    <span>&gt; {formData.company}</span>
                    <button 
                      type="button" 
                      onClick={removeCompany}
                      className="ml-2 text-[#00ffcc]/60 hover:text-red-500 transition-colors focus:outline-none"
                    >
                      [x]
                    </button>
                  </div>
                </div>
              )}

              {!formData.company && (
                <>
                  <div className="relative w-full mt-1">
                    <input 
                      type="text" 
                      placeholder="Type your company & press Enter..."
                      value={companyInput}
                      onChange={(e) => {
                        setCompanyInput(e.target.value);
                        setIsCompanyOpen(true);
                      }}
                      onFocus={() => setIsCompanyOpen(true)}
                      onClick={() => setIsCompanyOpen(true)}
                      onKeyDown={handleCompanyKeyDown}
                      disabled={isSubmitting}
                      autoComplete="off"
                      className="w-full bg-transparent border-0 border-b border-solid border-[#00ffcc]/50 pb-2 text-base text-[#00ffcc] placeholder-[#00ffcc]/30 focus:ring-0 focus:outline-none focus:border-[#00ffcc] transition-colors rounded-none appearance-none pr-8 disabled:opacity-50" 
                    />
                    <span className="absolute right-0 bottom-3 text-[#00ffcc]/50 pointer-events-none text-xs">
                      [ ▼ ]
                    </span>
                  </div>
                </>
              )}
              
              {isCompanyOpen && !formData.company && (
                <ul className="absolute top-full mt-2 left-0 w-full bg-[#121212] border border-solid border-[#00ffcc]/30 max-h-48 overflow-y-auto z-20 shadow-[0_0_15px_rgba(0,255,204,0.1)] rounded-none scrollbar-thin">
                  {filteredCompanies.length > 0 ? (
                    filteredCompanies.map((comp, idx) => (
                      <li key={idx} onClick={() => addCompany(comp)}
                        className="px-4 py-3 text-sm text-gray-400 hover:bg-[#00ffcc]/10 hover:text-[#00ffcc] cursor-pointer transition-colors border-b border-solid border-gray-800 last:border-0">
                        + {comp}
                      </li>
                    ))
                  ) : (
                    companyInput.trim() !== '' ? (
                      <li 
                        className="px-4 py-3 text-sm text-[#00ffcc] cursor-pointer hover:bg-[#00ffcc]/10 border-b border-solid border-gray-800"
                        onClick={() => addCompany(companyInput)}
                      >
                        [ Press Enter to lock "{companyInput}" ]
                      </li>
                    ) : (
                      <li className="px-4 py-3 text-sm text-[#00ffcc]/50 italic border-b border-solid border-gray-800">
                        [ No companies found ]
                      </li>
                    )
                  )}
                </ul>
              )}
            </div>
          )}

          <div className="flex flex-col relative">
            <label className="text-xs md:text-sm text-gray-500 uppercase tracking-widest mb-2 flex justify-between">
              <span>[ PLATFORM_INTEGRATION ] // Where do you need this? (Select up to 10) *</span>
            </label>

            {selectedPlatforms.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3 mt-1">
                {selectedPlatforms.map((plat, idx) => (
                  <div key={idx} className="flex items-center text-xs bg-black border border-solid border-gray-600 text-[#00ffcc] px-2 py-1">
                    <span>&gt; {plat}</span>
                    <button 
                      type="button" 
                      onClick={() => removePlatform(plat)}
                      className="ml-2 text-gray-500 hover:text-red-500 transition-colors focus:outline-none"
                    >
                      [x]
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="relative w-full mt-1">
              <input 
                type="text" 
                placeholder={selectedPlatforms.length >= 10 ? "[ LIMIT_REACHED ]" : "Type a tool & press Enter..."}
                value={platformInput}
                onChange={(e) => {
                  setPlatformInput(e.target.value);
                  setIsPlatformOpen(true);
                }}
                onFocus={() => setIsPlatformOpen(true)}
                onClick={() => setIsPlatformOpen(true)}
                onKeyDown={handlePlatformKeyDown}
                disabled={selectedPlatforms.length >= 10 || isSubmitting}
                autoComplete="off"
                className="w-full bg-transparent border-0 border-b border-solid border-gray-600 pb-2 text-base text-white placeholder-gray-600 focus:ring-0 focus:outline-none focus:border-[#00ffcc] transition-colors rounded-none appearance-none pr-8 disabled:opacity-50" 
              />
              <span className="absolute right-0 bottom-3 text-gray-500 pointer-events-none text-xs">
                [ ▼ ]
              </span>
            </div>
            
            {isPlatformOpen && selectedPlatforms.length < 10 && (
              <ul className="absolute top-full mt-2 left-0 w-full bg-[#121212] border border-solid border-gray-600 max-h-48 overflow-y-auto z-10 shadow-2xl shadow-black rounded-none scrollbar-thin">
                {filteredPlatforms.length > 0 ? (
                  filteredPlatforms.map((plat, idx) => (
                    <li key={idx} onClick={() => addPlatform(plat)}
                      className="px-4 py-3 text-sm text-gray-400 hover:bg-gray-900 hover:text-[#00ffcc] cursor-pointer transition-colors border-b border-solid border-gray-800 last:border-0">
                      + {plat}
                    </li>
                  ))
                ) : (
                  platformInput.trim() !== '' ? (
                    <li 
                      className="px-4 py-3 text-sm text-[#00ffcc] cursor-pointer hover:bg-gray-900 border-b border-solid border-gray-800"
                      onClick={() => addPlatform(platformInput)}
                    >
                      [ Press Enter to add "{platformInput}" ]
                    </li>
                  ) : (
                    <li className="px-4 py-3 text-sm text-gray-600 italic border-b border-solid border-gray-800">
                      [ No platforms found ]
                    </li>
                  )
                )}
              </ul>
            )}
          </div>

          <div>
            <Turnstile 
              siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY} 
              onSuccess={(token) => setTurnstileToken(token)}
              onError={() => alert('[ SECURITY_ERROR ] Cloudflare validation failed.')}
            />
          </div>

          <div className="w-full flex justify-center pt-8">
            <button type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center px-8 py-3 md:px-10 md:py-4 bg-transparent border border-solid border-gray-600 text-sm md:text-base font-bold uppercase tracking-widest hover:border-[#00ffcc] hover:text-[#00ffcc] hover:shadow-[0_0_15px_rgba(0,255,204,0.15)] transition-all rounded-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
              {isSubmitting ? '[ PROCESSING... ]' : '[ JOIN_THE_WAITLIST ]'}
            </button>
          </div>
        </form>

        <div className="w-full max-w-xl mt-20 border-t border-solid border-gray-800 pt-8 flex flex-col items-start">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-4">
            [ CONNECTION_LOGS: {submissions.length} USERS_WAITING ]
          </p>
          <div className="w-full space-y-2 h-40 overflow-y-auto pr-4 scrollbar-thin">
            {submissions.map((user) => (
              <div key={user.id} className="flex text-sm md:text-base text-gray-500 hover:text-[#00ffcc] transition-colors">
                <span className="w-14 text-gray-700">[{String(user.id).padStart(4, '0')}]</span>
                <span>{user.firstName}</span>
                <span className="ml-auto text-xs md:text-sm text-gray-600">WAITING</span>
              </div>
            ))}
            <div className="flex text-sm md:text-base text-[#00ffcc] animate-pulse">
              <span className="w-14 text-gray-700">[{String(submissions.length + 1).padStart(4, '0')}]</span>
              <span>_</span>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}