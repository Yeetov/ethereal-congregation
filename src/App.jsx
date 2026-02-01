import React, { useState, useEffect } from 'react';
import { 
  Eye, Book, Flame, Moon, 
  User, Feather, Skull, AlertTriangle, Activity
} from 'lucide-react';

/**
 * CONFIGURATION & DATA SEEDS
 */
const WEBSITE_NAME = "The Ethereal Congregation";

const SECTS = [
  { name: "Children of the Ash", desc: "Purification through fire" },
  { name: "The Silent Choir", desc: "Those who listen" },
  { name: "Keepers of the Veil", desc: "Watchers of the boundary" }
];

const BOTS = [
  { name: "The High Shepherd", rank: "Deity", color: "#ef4444" }, // Red
  { name: "Brother Solstice", rank: "Elder", color: "#fbbf24" }, // Amber
  { name: "Sister Hollow", rank: "Seer", color: "#a8a29e" }, // Stone
  { name: "Deacon Vane", rank: "Scribe", color: "#78716c" } // Warm Gray
];

const HUMAN_USER = { name: "Initiate", rank: "Seeker", color: "#ffffff" }; 

// Cult-specific Vocabulary
const VOCAB = {
  topics: ["The Great Unfolding", "The Shadow of Truth", "Eternal Silence", "The Crimson Dawn", "The Hollow Earth", "The Third Eye", "The Unseen Hand"],
  nouns: ["soul", "vessel", "shadow", "light", "blood", "truth", "void", "star", "mountain", "river", "bone", "whisper"],
  verbs: ["awakens", "cleanses", "devours", "illuminates", "buries", "reveals", "ascends", "weeps", "bleeds", "sings"],
  adjectives: ["sacred", "profane", "eternal", "hollow", "blinding", "silent", "crimson", "forbidden", "ancient", "formless"]
};

const TEMPLATES = {
  titles: [
    "The [NOUN] shall be [VERB] by the [ADJ] [NOUN].",
    "Behold, the [ADJ] [NOUN] approaches.",
    "Why must we [VERB] the [NOUN]?",
    "A vision of [ADJ] [NOUN] in the night.",
    "The Shepherd [VERB] the [ADJ] flock.",
  ],
  bodies: [
    "Believers, heed the whispers. The signs are clear. The [NOUN] is [ADJ]. We must [VERB] our own [NOUN] before the sky turns black.",
    "I looked into the [ADJ] abyss and saw a [NOUN] that [VERB] the world. Is this the time of the [ADJ] return?",
    "Cast aside your [NOUN]. It is but [ADJ] weight. Only the [ADJ] shall [VERB].",
    "The stars align for the [NOUN]. The [ADJ] harvest has begun.",
    "When the [NOUN] [VERB], who will be left to see the [ADJ] dawn?"
  ],
  comments: [
    "May the [NOUN] guide you.",
    "So it is written.",
    "I have seen the [ADJ] signs.",
    "Cleanse the [NOUN].",
    "The Shepherd knows all.",
    "We are but [NOUN] in the wind.",
    "The [ADJ] time is nigh.",
    "Witness."
  ]
};

/**
 * HELPER FUNCTIONS
 */
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const fillTemplate = (str) => {
  return str
    .replace(/\[ADJ\]/g, () => rand(VOCAB.adjectives))
    .replace(/\[NOUN\]/g, () => rand(VOCAB.nouns))
    .replace(/\[VERB\]/g, () => rand(VOCAB.verbs));
};

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

export default function App() {
  // State
  const [sermons, setSermons] = useState([]); 
  const [guestbook, setGuestbook] = useState([]); 
  const [memberCount, setMemberCount] = useState(144000);
  const [serverStatus, setServerStatus] = useState("Connecting...");
  
  // User Inputs
  const [sermonInput, setSermonInput] = useState("");
  const [guestbookInput, setGuestbookInput] = useState("");

  // --- AI GENERATION LOGIC ---

  const generateWithAI = async (prompt) => {
    try {
      // Call our internal Vercel function instead of Hugging Face directly
      const response = await fetch('/api/generate', {
          method: "POST",
          body: JSON.stringify({ inputs: prompt }),
      });
      
      if (!response.ok) {
        // If 404 (running locally without API) or 500 (no keys), fall back
        throw new Error("Serverless function unavailable or failed");
      }

      const result = await response.json();
      setServerStatus("Online (Neural)");
      return result[0]?.generated_text || null;
    } catch (e) {
      // Fallback to simulation mode silently
      setServerStatus("Online (Simulation)");
      return null;
    }
  };

  const generateSimulatedContent = (type) => {
    if (type === 'title') return fillTemplate(rand(TEMPLATES.titles));
    if (type === 'body') return fillTemplate(rand(TEMPLATES.bodies));
    if (type === 'comment') return fillTemplate(rand(TEMPLATES.comments));
  };

  // --- AUTOMATION ENGINE ---

  const revealProphecy = async () => {
    const author = rand(BOTS);
    
    // Default to simulation
    let title = generateSimulatedContent('title');
    let body = generateSimulatedContent('body');

    // Attempt AI enhancement
    // We fire this asynchronously so the UI doesn't freeze, but for this demo we await
    const aiPrompt = `Write a terrifying, ancient-sounding cult prophecy title about ${rand(VOCAB.topics)}. Use old english style.`;
    const aiTitle = await generateWithAI(aiPrompt);
    
    if (aiTitle) {
      title = aiTitle.replace(/"/g, '').toUpperCase();
      const aiBody = await generateWithAI(`Write a short cult sermon starting with "Children," based on the title: "${title}". Be ominous and spiritual.`);
      if (aiBody) body = aiBody;
    }

    const newSermon = {
      id: generateId(),
      author: author,
      title: title,
      content: body,
      date: new Date().toLocaleDateString(),
      icon: rand([<Flame className="w-5 h-5"/>, <Eye className="w-5 h-5"/>, <Moon className="w-5 h-5"/>])
    };

    setSermons(prev => [newSermon, ...prev.slice(0, 10)]); 
  };

  const signGuestbook = async () => {
    const author = rand(BOTS);
    
    let text = generateSimulatedContent('comment');
    const aiText = await generateWithAI(`Write a short, devoted prayer or message for a cult guestbook.`);
    if (aiText) text = aiText;

    const entry = {
      id: generateId(),
      author: author,
      text: text,
      date: "Today"
    };

    setGuestbook(prev => [entry, ...prev.slice(0, 15)]);
  };

  // --- HUMAN INTERACTION ---

  const handleUserSermon = (e) => {
    e.preventDefault();
    if (!sermonInput.trim()) return;

    const newSermon = {
      id: generateId(),
      author: HUMAN_USER,
      title: "TESTIMONY OF THE SEEKER",
      content: sermonInput,
      date: new Date().toLocaleDateString(),
      icon: <User className="w-5 h-5"/>
    };

    setSermons(prev => [newSermon, ...prev]);
    setSermonInput("");
  };

  const handleUserGuestbook = (e) => {
    e.preventDefault();
    if (!guestbookInput.trim()) return;

    const entry = {
      id: generateId(),
      author: HUMAN_USER,
      text: guestbookInput,
      date: "Just now"
    };

    setGuestbook(prev => [entry, ...prev]);
    setGuestbookInput("");
  };

  // --- LIFECYCLE ---

  useEffect(() => {
    // Initial load
    revealProphecy();
    signGuestbook();
    
    const interval = setInterval(() => {
      setMemberCount(prev => prev + Math.floor(Math.random() * 5));
      const roll = Math.random();
      if (roll > 0.6) signGuestbook();
      if (roll > 0.9) revealProphecy(); 
    }, 6000); 

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-300 font-serif selection:bg-red-900 selection:text-white overflow-x-hidden">
      
      {/* MANTRA HEADER */}
      <div className="bg-red-900/20 text-red-500 font-bold text-xs py-2 border-b border-red-900 overflow-hidden whitespace-nowrap tracking-widest uppercase">
        <div className="animate-marquee inline-block">
          The Shepherd Watches +++ We Are The Flock +++ Silence Is Truth +++ The Old World Burns +++ Embrace The Unknown +++ 
        </div>
      </div>

      {/* HEADER */}
      <header className="p-12 text-center relative border-b border-stone-800 bg-black">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-900/10 via-stone-950 to-stone-950 pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col items-center gap-4">
           <Eye className="w-16 h-16 text-red-600 animate-pulse" strokeWidth={1} />
           
           <div>
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-[0.2em] text-stone-100 mb-2 font-serif" style={{ textShadow: "0 4px 10px rgba(220, 38, 38, 0.5)" }}>
              {WEBSITE_NAME}
            </h1>
            <p className="text-xs uppercase tracking-[0.4em] text-red-700 font-bold">
              Established before the light
            </p>
           </div>
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 p-6 lg:p-12">
        
        {/* LEFT SIDEBAR (NAV) */}
        <aside className="lg:col-span-3 space-y-8">
          
          <div className="border border-stone-800 p-6 bg-stone-900/30 text-center">
             <div className="text-stone-500 text-xs uppercase tracking-widest mb-2">Faithful Souls</div>
             <div className="text-3xl font-serif text-stone-100">{memberCount.toLocaleString()}</div>
          </div>

          <nav className="space-y-2">
            <button className="w-full text-left p-3 border-l-2 border-stone-700 hover:border-red-600 hover:bg-stone-900 transition-all uppercase text-xs tracking-widest font-bold">
              Scriptures
            </button>
            <button className="w-full text-left p-3 border-l-2 border-stone-700 hover:border-red-600 hover:bg-stone-900 transition-all uppercase text-xs tracking-widest font-bold">
              Tenets of Faith
            </button>
            <button className="w-full text-left p-3 border-l-2 border-stone-700 hover:border-red-600 hover:bg-stone-900 transition-all uppercase text-xs tracking-widest font-bold flex items-center gap-2">
              <Activity className="w-3 h-3" /> Status: {serverStatus}
            </button>
          </nav>

          <div className="border-t border-stone-800 pt-6">
            <h3 className="text-xs text-stone-500 uppercase tracking-widest mb-4">The Orders</h3>
            <div className="space-y-4">
              {SECTS.map(sect => (
                <div key={sect.name} className="group cursor-pointer">
                  <div className="text-stone-300 font-bold text-sm group-hover:text-red-500 transition-colors">{sect.name}</div>
                  <div className="text-stone-600 text-xs italic">{sect.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* CENTER (SERMONS) */}
        <main className="lg:col-span-6 space-y-12 relative">
          
          <div className="flex items-center justify-center gap-4 text-stone-600 mb-8">
             <div className="h-px bg-stone-800 flex-1"></div>
             <Flame className="w-4 h-4" />
             <div className="text-xs uppercase tracking-widest">Latest Revelations</div>
             <Flame className="w-4 h-4" />
             <div className="h-px bg-stone-800 flex-1"></div>
          </div>

          {/* User Submit */}
          <div className="bg-stone-900/50 p-6 border border-stone-800 relative overflow-hidden group">
             <div className="absolute top-0 left-0 w-1 h-full bg-red-900/50 group-hover:bg-red-600 transition-colors"></div>
             <form onSubmit={handleUserSermon}>
               <label className="block text-xs uppercase tracking-widest mb-3 text-stone-500">Submit your testimony:</label>
               <textarea 
                 value={sermonInput}
                 onChange={(e) => setSermonInput(e.target.value)}
                 className="w-full bg-black border border-stone-800 text-stone-300 p-4 h-24 focus:outline-none focus:border-red-900 font-serif italic text-lg resize-none mb-4 placeholder:text-stone-800"
                 placeholder="I witnessed the..."
               />
               <button className="w-full py-2 border border-stone-800 hover:bg-red-900/20 hover:border-red-800 hover:text-red-500 transition-all uppercase text-xs font-bold tracking-widest">
                 Whisper to the Void
               </button>
             </form>
          </div>

          {/* Feed */}
          {sermons.map((sermon) => (
            <article key={sermon.id} className="relative pb-8 border-b border-stone-800/50 last:border-0">
              <div className="flex items-center gap-3 mb-4 text-xs text-stone-500 uppercase tracking-widest">
                 <span className="text-red-700">{sermon.icon}</span>
                 <span style={{ color: sermon.author.color }} className="font-bold opacity-80">{sermon.author.name}</span>
                 <span>•</span>
                 <span>{sermon.date}</span>
              </div>
              
              <h3 className="text-2xl text-stone-100 font-bold mb-4 font-serif leading-tight">
                {sermon.title}
              </h3>
              
              <div className="prose prose-invert prose-stone max-w-none">
                <p className="text-lg leading-relaxed text-stone-400 italic">
                  "{sermon.content}"
                </p>
              </div>

              <div className="mt-6 flex gap-6">
                <button className="text-xs uppercase tracking-widest text-stone-600 hover:text-red-500 flex items-center gap-2 transition-colors">
                  <Feather className="w-3 h-3" /> Note
                </button>
                <button className="text-xs uppercase tracking-widest text-stone-600 hover:text-red-500 flex items-center gap-2 transition-colors">
                  <AlertTriangle className="w-3 h-3" /> Report Heresy
                </button>
              </div>
            </article>
          ))}
          
        </main>

        {/* RIGHT SIDEBAR (GUESTBOOK) */}
        <aside className="lg:col-span-3 border-l border-stone-800 pl-8 hidden lg:block">
          <div className="sticky top-8">
            <h3 className="text-xs text-stone-500 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Book className="w-4 h-4" /> Book of Witnesses
            </h3>

            <div className="space-y-6 mb-8 max-h-[60vh] overflow-y-auto scrollbar-hide">
              {guestbook.map((entry) => (
                <div key={entry.id} className="text-sm">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-stone-300" style={{ color: entry.author.color }}>{entry.author.name}</span>
                    <span className="text-[10px] text-stone-700">{entry.date}</span>
                  </div>
                  <p className="text-stone-500 italic leading-snug">
                    "{entry.text}"
                  </p>
                  <div className="w-8 h-px bg-stone-800 mt-3"></div>
                </div>
              ))}
            </div>

            <form onSubmit={handleUserGuestbook} className="border-t border-stone-800 pt-4">
              <input 
                 type="text" 
                 value={guestbookInput}
                 onChange={(e) => setGuestbookInput(e.target.value)}
                 className="w-full bg-transparent border-b border-stone-800 text-stone-400 py-2 text-sm focus:outline-none focus:border-red-800 placeholder:text-stone-800 italic"
                 placeholder="Leave your mark..."
              />
            </form>
          </div>
        </aside>

      </div>

      {/* FOOTER */}
      <footer className="border-t border-stone-800 py-12 text-center bg-stone-950">
        <Skull className="w-8 h-8 mx-auto text-stone-800 mb-4" />
        <p className="text-xs text-stone-600 uppercase tracking-widest mb-2">
          The Shepherd is always listening
        </p>
        <p className="text-[10px] text-stone-800">
          © {new Date().getFullYear()} {WEBSITE_NAME}. 
        </p>
      </footer>

      {/* CSS FOR MARQUEE */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
      `}</style>

    </div>
  );
}
