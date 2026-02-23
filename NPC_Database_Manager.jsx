import React, { useState, useEffect, useRef } from 'react';

const CIRCLES = ['Mortalis', 'Night', 'Power', 'Wild'];
const CIRCLE_COLORS = {
  Mortalis: { bg: '#5A8A4F', light: '#E8F0E6', text: '#8FBC8F' },
  Night: { bg: '#8B5A8A', light: '#F0E6EE', text: '#DDA0DD' },
  Power: { bg: '#4A7AB0', light: '#E6EEF5', text: '#87CEEB' },
  Wild: { bg: '#CD853F', light: '#F5EDE6', text: '#DEB887' }
};

const MAX_IMAGE_SIZE = 500000; // 500KB
const MAX_IMAGE_DIMENSION = 800; // Max width or height in pixels

const EMPTY_NPC = {
  id: '',
  name: '',
  title: '',
  circle: 'Mortalis',
  status: 1,
  harm: 3,
  armor: 0,
  drive: '',
  faction: '',
  look: '',
  image: '',
  attacks: '',
  vulnerabilities: '',
  resistances: '',
  special: '',
  background: '',
  currentSituation: '',
  speech: '',
  mannerisms: '',
  whenAfraid: '',
  whenChallenged: '',
  greatestFear: '',
  greatestStrength: '',
  respects: '',
  despises: '',
  quote: '',
  debtsOwed: [{ creditor: '', context: '' }],
  debtsOwedTo: [{ debtor: '', context: '' }],
  relationships: [{ name: '', description: '' }],
  storyHooks: [''],
  sessionNotes: ''
};

export default function NPCDatabaseManager() {
  const [npcs, setNpcs] = useState([]);
  const [currentNpc, setCurrentNpc] = useState({ ...EMPTY_NPC, id: crypto.randomUUID() });
  const [view, setView] = useState('list');
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCircle, setFilterCircle] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('');
  const [lightboxImage, setLightboxImage] = useState(null);
  const [lightboxName, setLightboxName] = useState('');
  const printRef = useRef(null);

  // Resize image to fit within size limit
  const resizeImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Scale down if dimensions are too large
          if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
            if (width > height) {
              height = (height / width) * MAX_IMAGE_DIMENSION;
              width = MAX_IMAGE_DIMENSION;
            } else {
              width = (width / height) * MAX_IMAGE_DIMENSION;
              height = MAX_IMAGE_DIMENSION;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // Start with high quality and reduce until under size limit
          let quality = 0.9;
          let result = canvas.toDataURL('image/jpeg', quality);
          
          while (result.length > MAX_IMAGE_SIZE && quality > 0.1) {
            quality -= 0.1;
            result = canvas.toDataURL('image/jpeg', quality);
          }
          
          // If still too large, scale down dimensions further
          if (result.length > MAX_IMAGE_SIZE) {
            const scale = Math.sqrt(MAX_IMAGE_SIZE / result.length);
            canvas.width = width * scale;
            canvas.height = height * scale;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            result = canvas.toDataURL('image/jpeg', 0.8);
          }
          
          resolve(result);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const openLightbox = (image, name) => {
    setLightboxImage(image);
    setLightboxName(name);
  };

  const closeLightbox = () => {
    setLightboxImage(null);
    setLightboxName('');
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined' && window.print) {
      window.print();
    } else {
      alert('Print functionality is not available in this environment. Please use your browser\'s print function (Ctrl+P or Cmd+P).');
    }
  };

  useEffect(() => {
    async function loadData() {
      try {
        const result = await window.storage.get('urban-shadows-npcs');
        if (result && result.value) {
          setNpcs(JSON.parse(result.value));
        }
      } catch (e) {
        console.log('No existing data or storage error:', e);
      }
      setIsLoading(false);
    }
    loadData();
  }, []);

  const saveToStorage = async (updatedNpcs) => {
    try {
      await window.storage.set('urban-shadows-npcs', JSON.stringify(updatedNpcs));
      setSaveStatus('Saved!');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (e) {
      console.error('Save error:', e);
      setSaveStatus('Save failed');
    }
  };

  const handleSaveNpc = async () => {
    let updatedNpcs;
    if (editingId) {
      updatedNpcs = npcs.map(n => n.id === editingId ? currentNpc : n);
    } else {
      updatedNpcs = [...npcs, currentNpc];
    }
    setNpcs(updatedNpcs);
    await saveToStorage(updatedNpcs);
    setCurrentNpc({ ...EMPTY_NPC, id: crypto.randomUUID() });
    setEditingId(null);
    setView('list');
  };

  const handleDeleteNpc = async (id) => {
    if (confirm('Delete this NPC?')) {
      const updatedNpcs = npcs.filter(n => n.id !== id);
      setNpcs(updatedNpcs);
      await saveToStorage(updatedNpcs);
      if (view === 'detail') setView('list');
    }
  };

  const handleEditNpc = (npc) => {
    setCurrentNpc({ ...npc });
    setEditingId(npc.id);
    setView('form');
  };

  const handleViewNpc = (npc) => {
    setCurrentNpc({ ...npc });
    setView('detail');
  };

  const handleNewNpc = () => {
    setCurrentNpc({ ...EMPTY_NPC, id: crypto.randomUUID() });
    setEditingId(null);
    setView('form');
  };

  const updateField = (field, value) => {
    setCurrentNpc(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const resizedImage = await resizeImage(file);
        updateField('image', resizedImage);
      } catch (err) {
        console.error('Error resizing image:', err);
        alert('Error processing image. Please try another image.');
      }
    }
  };

  const removeImage = () => {
    updateField('image', '');
  };

  const updateArrayField = (field, index, subfield, value) => {
    setCurrentNpc(prev => {
      const arr = [...prev[field]];
      if (subfield) {
        arr[index] = { ...arr[index], [subfield]: value };
      } else {
        arr[index] = value;
      }
      return { ...prev, [field]: arr };
    });
  };

  const addArrayItem = (field, template) => {
    setCurrentNpc(prev => ({
      ...prev,
      [field]: [...prev[field], template]
    }));
  };

  const removeArrayItem = (field, index) => {
    setCurrentNpc(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const filteredNpcs = npcs.filter(npc => {
    const matchesSearch = npc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          npc.faction?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCircle = filterCircle === 'All' || npc.circle === filterCircle;
    return matchesSearch && matchesCircle;
  });

  const exportData = () => {
    const blob = new Blob([JSON.stringify(npcs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'urban-shadows-npcs.json';
    a.click();
  };

  const importData = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const imported = JSON.parse(event.target.result);
          const merged = [...npcs];
          imported.forEach(imp => {
            if (!merged.find(n => n.id === imp.id)) {
              merged.push(imp);
            }
          });
          setNpcs(merged);
          await saveToStorage(merged);
        } catch (err) {
          alert('Invalid JSON file');
        }
      };
      reader.readAsText(file);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
        <div className="text-xl">Loading NPC Database...</div>
      </div>
    );
  }

  // LIST VIEW
  if (view === 'list') {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 p-4">
        {/* Lightbox Modal */}
        {lightboxImage && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
            onClick={closeLightbox}
          >
            <div className="relative max-w-4xl max-h-full">
              <img 
                src={lightboxImage} 
                alt={lightboxName} 
                className="max-w-full max-h-[90vh] object-contain rounded-lg"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-center py-2 rounded-b-lg">
                {lightboxName}
              </div>
              <button 
                onClick={closeLightbox}
                className="absolute top-2 right-2 bg-gray-800 hover:bg-gray-700 text-white rounded-full w-10 h-10 flex items-center justify-center text-2xl"
              >
                ×
              </button>
            </div>
          </div>
        )}

        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-100">Urban Shadows NPC Database</h1>
            <div className="flex gap-2 items-center">
              {saveStatus && <span className="text-emerald-400 text-sm">{saveStatus}</span>}
              <button onClick={handleNewNpc} className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded font-semibold text-white">
                + New NPC
              </button>
            </div>
          </div>

          <div className="flex gap-4 mb-4 flex-wrap">
            <input
              type="text"
              placeholder="Search by name or faction..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-gray-800 border border-gray-600 rounded px-3 py-2 flex-1 min-w-48 text-gray-100 placeholder-gray-400"
            />
            <select
              value={filterCircle}
              onChange={e => setFilterCircle(e.target.value)}
              className="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-gray-100"
            >
              <option value="All">All Circles</option>
              {CIRCLES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={exportData} className="bg-sky-600 hover:bg-sky-500 px-3 py-2 rounded text-sm text-white">
              Export JSON
            </button>
            <label className="bg-violet-500 hover:bg-violet-400 px-3 py-2 rounded text-sm cursor-pointer text-white">
              Import JSON
              <input type="file" accept=".json" onChange={importData} className="hidden" />
            </label>
          </div>

          <div className="text-sm text-gray-400 mb-4">{filteredNpcs.length} NPCs</div>

          {filteredNpcs.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-xl mb-2">No NPCs yet</p>
              <p>Click "New NPC" to create your first character</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredNpcs.map(npc => (
                <div
                  key={npc.id}
                  className="bg-gray-800 rounded-lg p-4 flex justify-between items-center hover:bg-gray-750 cursor-pointer border-l-4"
                  onClick={() => handleViewNpc(npc)}
                  style={{ borderLeftColor: CIRCLE_COLORS[npc.circle]?.bg || '#666' }}
                >
                  <div className="flex items-center gap-4">
                    {npc.image ? (
                      <img 
                        src={npc.image} 
                        alt={npc.name} 
                        className="w-12 h-12 rounded-full object-cover cursor-pointer hover:opacity-80"
                        onClick={(e) => { e.stopPropagation(); openLightbox(npc.image, npc.name); }}
                        title="Click to enlarge"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center text-gray-500 text-lg font-bold">
                        {npc.name ? npc.name[0].toUpperCase() : '?'}
                      </div>
                    )}
                    <div>
                      <div className="font-bold text-lg text-gray-100">{npc.name || 'Unnamed NPC'}</div>
                      <div className="text-sm text-gray-400">
                        {npc.title && <span>{npc.title} • </span>}
                        <span className="font-semibold" style={{ color: CIRCLE_COLORS[npc.circle]?.text }}>{npc.circle}</span>
                        {npc.faction && <span> • {npc.faction}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-xs text-gray-500">Status</div>
                      <div className="font-bold text-gray-100">{npc.status}</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={e => { e.stopPropagation(); handleEditNpc(npc); }}
                        className="bg-sky-600 hover:bg-sky-500 px-3 py-1 rounded text-sm text-white"
                      >
                        Edit
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleDeleteNpc(npc.id); }}
                        className="bg-red-600 hover:bg-red-500 px-3 py-1 rounded text-sm text-white"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // DETAIL VIEW
  if (view === 'detail') {
    const npc = currentNpc;
    const colors = CIRCLE_COLORS[npc.circle] || CIRCLE_COLORS.Mortalis;
    
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 p-4">
        {/* Lightbox Modal */}
        {lightboxImage && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4 print:hidden"
            onClick={closeLightbox}
          >
            <div className="relative max-w-4xl max-h-full">
              <img 
                src={lightboxImage} 
                alt={lightboxName} 
                className="max-w-full max-h-[90vh] object-contain rounded-lg"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-center py-2 rounded-b-lg">
                {lightboxName}
              </div>
              <button 
                onClick={closeLightbox}
                className="absolute top-2 right-2 bg-gray-800 hover:bg-gray-700 text-white rounded-full w-10 h-10 flex items-center justify-center text-2xl"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Print Styles */}
        <style>{`
          @media print {
            body { 
              background: white !important; 
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .print\\:hidden { display: none !important; }
            .print\\:bg-white { background: white !important; }
            .print\\:text-black { color: black !important; }
            .print\\:border-gray-300 { border-color: #d1d5db !important; }
            .bg-gray-900 { background: white !important; }
            .bg-gray-800 { background: #f3f4f6 !important; }
            .bg-gray-700 { background: #e5e7eb !important; }
            .text-gray-100, .text-gray-200, .text-gray-300 { color: #1f2937 !important; }
            .text-gray-400, .text-gray-500 { color: #4b5563 !important; }
          }
        `}</style>

        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-4 print:hidden">
            <button onClick={() => setView('list')} className="text-gray-400 hover:text-gray-200">
              ← Back to List
            </button>
            <div className="flex gap-2">
              <button onClick={handlePrint} className="bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded text-white">
                🖨️ Print Dossier
              </button>
              <button onClick={() => handleEditNpc(npc)} className="bg-sky-600 hover:bg-sky-500 px-4 py-2 rounded text-white">
                Edit
              </button>
            </div>
          </div>
          
          <div ref={printRef} className="bg-gray-800 rounded-lg overflow-hidden border-t-4" style={{ borderTopColor: colors.bg }}>
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex gap-4 items-start">
                  {npc.image ? (
                    <img 
                      src={npc.image} 
                      alt={npc.name} 
                      className="w-24 h-28 rounded-lg object-cover border-2 cursor-pointer hover:opacity-80 transition-opacity print:w-20 print:h-24" 
                      style={{ borderColor: colors.bg }}
                      onClick={() => openLightbox(npc.image, npc.name)}
                      title="Click to enlarge"
                    />
                  ) : (
                    <div className="w-24 h-28 rounded-lg bg-gray-700 flex items-center justify-center text-gray-500 text-2xl font-bold border-2 border-gray-600 print:w-20 print:h-24">
                      {npc.name ? npc.name[0].toUpperCase() : '?'}
                    </div>
                  )}
                  <div>
                    <h1 className="text-3xl font-bold text-gray-100">{npc.name}</h1>
                    <p className="text-gray-400">{npc.title}</p>
                    {npc.faction && <p className="text-gray-400 text-sm mt-1">{npc.faction}</p>}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="text-center p-3 rounded text-white" style={{ backgroundColor: colors.bg }}>
                  <div className="text-xs opacity-80">Circle</div>
                  <div className="font-bold">{npc.circle}</div>
                </div>
                <div className="bg-gray-700 text-center p-3 rounded">
                  <div className="text-xs text-gray-400">Status</div>
                  <div className="font-bold text-xl text-gray-100">{npc.status}</div>
                </div>
                <div className="bg-gray-700 text-center p-3 rounded">
                  <div className="text-xs text-gray-400">Harm</div>
                  <div className="font-bold text-xl text-gray-100">{npc.harm}</div>
                </div>
                <div className="bg-gray-700 text-center p-3 rounded">
                  <div className="text-xs text-gray-400">Armor</div>
                  <div className="font-bold text-xl text-gray-100">{npc.armor}</div>
                </div>
              </div>

              {npc.drive && (
                <div className="mb-4">
                  <span className="font-bold text-gray-100">Drive: </span>
                  <span className="text-gray-300">{npc.drive}</span>
                </div>
              )}

              {npc.look && (
                <div className="mb-4">
                  <h3 className="font-bold text-lg mb-1" style={{ color: colors.text }}>Look</h3>
                  <p className="text-gray-300">{npc.look}</p>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                {(npc.attacks || npc.vulnerabilities || npc.resistances || npc.special) && (
                  <div>
                    <h3 className="font-bold text-lg mb-2" style={{ color: colors.text }}>Combat</h3>
                    {npc.attacks && <p className="mb-1 text-gray-300"><span className="font-semibold text-gray-100">Attacks:</span> {npc.attacks}</p>}
                    {npc.vulnerabilities && <p className="mb-1 text-gray-300"><span className="font-semibold text-gray-100">Vulnerabilities:</span> {npc.vulnerabilities}</p>}
                    {npc.resistances && <p className="mb-1 text-gray-300"><span className="font-semibold text-gray-100">Resistances:</span> {npc.resistances}</p>}
                    {npc.special && <p className="text-gray-300"><span className="font-semibold text-gray-100">Special:</span> {npc.special}</p>}
                  </div>
                )}

                {(npc.speech || npc.mannerisms || npc.whenAfraid || npc.whenChallenged) && (
                  <div>
                    <h3 className="font-bold text-lg mb-2" style={{ color: colors.text }}>Roleplaying</h3>
                    {npc.speech && <p className="mb-1 text-gray-300"><span className="font-semibold text-gray-100">Speech:</span> {npc.speech}</p>}
                    {npc.mannerisms && <p className="mb-1 text-gray-300"><span className="font-semibold text-gray-100">Mannerisms:</span> {npc.mannerisms}</p>}
                    {npc.whenAfraid && <p className="mb-1 text-gray-300"><span className="font-semibold text-gray-100">When Afraid:</span> {npc.whenAfraid}</p>}
                    {npc.whenChallenged && <p className="text-gray-300"><span className="font-semibold text-gray-100">When Challenged:</span> {npc.whenChallenged}</p>}
                  </div>
                )}
              </div>

              {npc.background && (
                <div className="mb-4">
                  <h3 className="font-bold text-lg mb-1" style={{ color: colors.text }}>Background</h3>
                  <p className="text-gray-300 whitespace-pre-wrap">{npc.background}</p>
                </div>
              )}

              {npc.currentSituation && (
                <div className="mb-4">
                  <h3 className="font-bold text-lg mb-1" style={{ color: colors.text }}>Current Situation</h3>
                  <p className="text-gray-300 whitespace-pre-wrap">{npc.currentSituation}</p>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                {npc.greatestFear && <p className="text-gray-300"><span className="font-semibold text-gray-100">Greatest Fear:</span> {npc.greatestFear}</p>}
                {npc.greatestStrength && <p className="text-gray-300"><span className="font-semibold text-gray-100">Greatest Strength:</span> {npc.greatestStrength}</p>}
                {npc.respects && <p className="text-gray-300"><span className="font-semibold text-gray-100">Respects:</span> {npc.respects}</p>}
                {npc.despises && <p className="text-gray-300"><span className="font-semibold text-gray-100">Despises:</span> {npc.despises}</p>}
              </div>

              {npc.quote && (
                <div className="bg-gray-700 p-4 rounded italic text-center mb-6 text-gray-200">
                  "{npc.quote}"
                </div>
              )}

              {npc.debtsOwed?.some(d => d.creditor) && (
                <div className="mb-4">
                  <h3 className="font-bold text-lg mb-2" style={{ color: colors.text }}>Debts Owed</h3>
                  {npc.debtsOwed.filter(d => d.creditor).map((debt, i) => (
                    <div key={i} className="bg-gray-700 p-3 rounded mb-2">
                      <div className="font-semibold text-gray-100">{debt.creditor}</div>
                      <div className="text-sm text-gray-400">{debt.context}</div>
                    </div>
                  ))}
                </div>
              )}

              {npc.debtsOwedTo?.some(d => d.debtor) && (
                <div className="mb-4">
                  <h3 className="font-bold text-lg mb-2" style={{ color: colors.text }}>Debts Owed To {npc.name.split(' ')[0]}</h3>
                  {npc.debtsOwedTo.filter(d => d.debtor).map((debt, i) => (
                    <div key={i} className="bg-gray-700 p-3 rounded mb-2">
                      <div className="font-semibold text-gray-100">{debt.debtor}</div>
                      <div className="text-sm text-gray-400">{debt.context}</div>
                    </div>
                  ))}
                </div>
              )}

              {npc.relationships?.some(r => r.name) && (
                <div className="mb-4">
                  <h3 className="font-bold text-lg mb-2" style={{ color: colors.text }}>Key Relationships</h3>
                  {npc.relationships.filter(r => r.name).map((rel, i) => (
                    <p key={i} className="mb-1 text-gray-300"><span className="font-semibold text-gray-100">{rel.name}:</span> {rel.description}</p>
                  ))}
                </div>
              )}

              {npc.storyHooks?.some(h => h) && (
                <div className="mb-4">
                  <h3 className="font-bold text-lg mb-2" style={{ color: colors.text }}>Story Hooks</h3>
                  <div className="rounded overflow-hidden">
                    {npc.storyHooks.filter(h => h).map((hook, i) => (
                      <div 
                        key={i} 
                        className={`px-3 py-2 text-gray-300 ${i % 2 === 0 ? 'bg-gray-700' : 'bg-gray-750'}`}
                        style={{ backgroundColor: i % 2 === 0 ? '#374151' : '#2d3748' }}
                      >
                        {hook}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {npc.sessionNotes && (
                <div>
                  <h3 className="font-bold text-lg mb-2" style={{ color: colors.text }}>Session Notes</h3>
                  <p className="text-gray-300 whitespace-pre-wrap">{npc.sessionNotes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // FORM VIEW
  const colors = CIRCLE_COLORS[currentNpc.circle] || CIRCLE_COLORS.Mortalis;
  
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4">
      {/* Lightbox Modal */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
          onClick={closeLightbox}
        >
          <div className="relative max-w-4xl max-h-full">
            <img 
              src={lightboxImage} 
              alt={lightboxName} 
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-center py-2 rounded-b-lg">
              {lightboxName}
            </div>
            <button 
              onClick={closeLightbox}
              className="absolute top-2 right-2 bg-gray-800 hover:bg-gray-700 text-white rounded-full w-10 h-10 flex items-center justify-center text-2xl"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-100">{editingId ? 'Edit NPC' : 'New NPC'}</h1>
          <button onClick={() => setView('list')} className="text-gray-400 hover:text-gray-200">
            Cancel
          </button>
        </div>

        <div className="space-y-6">
          {/* Basic Info with Image */}
          <section className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-xl font-bold mb-4" style={{ color: colors.text }}>Basic Information</h2>
            
            <div className="flex gap-6 mb-4">
              {/* Image Upload */}
              <div className="flex-shrink-0">
                <label className="block text-sm text-gray-400 mb-2">Portrait</label>
                {currentNpc.image ? (
                  <div className="relative">
                    <img 
                      src={currentNpc.image} 
                      alt="NPC" 
                      className="w-32 h-40 rounded-lg object-cover border-2 cursor-pointer hover:opacity-80" 
                      style={{ borderColor: colors.bg }}
                      onClick={() => openLightbox(currentNpc.image, currentNpc.name || 'NPC')}
                      title="Click to enlarge"
                    />
                    <button
                      onClick={removeImage}
                      className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm"
                    >×</button>
                  </div>
                ) : (
                  <label className="w-32 h-40 rounded-lg bg-gray-700 border-2 border-dashed border-gray-600 flex flex-col items-center justify-center cursor-pointer hover:border-gray-500 hover:bg-gray-650">
                    <span className="text-3xl text-gray-500 mb-1">+</span>
                    <span className="text-xs text-gray-500 text-center px-2">Click to add image</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                )}
                <p className="text-xs text-gray-500 mt-1 w-32">Auto-resized</p>
              </div>

              {/* Name and Title */}
              <div className="flex-1 grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Name *</label>
                  <input
                    type="text"
                    value={currentNpc.name}
                    onChange={e => updateField('name', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-100 placeholder-gray-500"
                    placeholder="Character Name"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Title/Role</label>
                  <input
                    type="text"
                    value={currentNpc.title}
                    onChange={e => updateField('title', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-100 placeholder-gray-500"
                    placeholder="e.g., Investigative Journalist"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Circle</label>
                  <select
                    value={currentNpc.circle}
                    onChange={e => updateField('circle', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-100"
                  >
                    {CIRCLES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Faction</label>
                  <input
                    type="text"
                    value={currentNpc.faction}
                    onChange={e => updateField('faction', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-100 placeholder-gray-500"
                    placeholder="e.g., Aware Network"
                  />
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Status</label>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    value={currentNpc.status}
                    onChange={e => updateField('status', parseInt(e.target.value) || 0)}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Harm</label>
                  <input
                    type="number"
                    min="0"
                    value={currentNpc.harm}
                    onChange={e => updateField('harm', parseInt(e.target.value) || 0)}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Armor</label>
                  <input
                    type="number"
                    min="0"
                    value={currentNpc.armor}
                    onChange={e => updateField('armor', parseInt(e.target.value) || 0)}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-100"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Drive</label>
                <input
                  type="text"
                  value={currentNpc.drive}
                  onChange={e => updateField('drive', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-100 placeholder-gray-500"
                  placeholder="What motivates them?"
                />
              </div>
            </div>
          </section>

          {/* Appearance */}
          <section className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-xl font-bold mb-4" style={{ color: colors.text }}>Appearance</h2>
            <textarea
              value={currentNpc.look}
              onChange={e => updateField('look', e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 h-24 text-gray-100 placeholder-gray-500"
              placeholder="Physical description..."
            />
          </section>

          {/* Combat */}
          <section className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-xl font-bold mb-4" style={{ color: colors.text }}>Combat</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Attacks</label>
                <input
                  type="text"
                  value={currentNpc.attacks}
                  onChange={e => updateField('attacks', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-100 placeholder-gray-500"
                  placeholder="e.g., Blessed bat (3-harm hand holy)"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Vulnerabilities</label>
                <input
                  type="text"
                  value={currentNpc.vulnerabilities}
                  onChange={e => updateField('vulnerabilities', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-100 placeholder-gray-500"
                  placeholder="Weaknesses..."
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Resistances</label>
                <input
                  type="text"
                  value={currentNpc.resistances}
                  onChange={e => updateField('resistances', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-100 placeholder-gray-500"
                  placeholder="What they resist..."
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Special Abilities</label>
                <input
                  type="text"
                  value={currentNpc.special}
                  onChange={e => updateField('special', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-100 placeholder-gray-500"
                  placeholder="Special powers or abilities..."
                />
              </div>
            </div>
          </section>

          {/* Background & Situation */}
          <section className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-xl font-bold mb-4" style={{ color: colors.text }}>Background & Situation</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Background</label>
                <textarea
                  value={currentNpc.background}
                  onChange={e => updateField('background', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 h-24 text-gray-100 placeholder-gray-500"
                  placeholder="History and backstory..."
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Current Situation</label>
                <textarea
                  value={currentNpc.currentSituation}
                  onChange={e => updateField('currentSituation', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 h-24 text-gray-100 placeholder-gray-500"
                  placeholder="What's happening now..."
                />
              </div>
            </div>
          </section>

          {/* Roleplaying */}
          <section className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-xl font-bold mb-4" style={{ color: colors.text }}>Roleplaying</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Speech Pattern</label>
                <input
                  type="text"
                  value={currentNpc.speech}
                  onChange={e => updateField('speech', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-100 placeholder-gray-500"
                  placeholder="How they talk..."
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Mannerisms</label>
                <input
                  type="text"
                  value={currentNpc.mannerisms}
                  onChange={e => updateField('mannerisms', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-100 placeholder-gray-500"
                  placeholder="Physical habits, gestures..."
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">When Afraid</label>
                <input
                  type="text"
                  value={currentNpc.whenAfraid}
                  onChange={e => updateField('whenAfraid', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-100 placeholder-gray-500"
                  placeholder="Behavior when scared..."
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">When Challenged</label>
                <input
                  type="text"
                  value={currentNpc.whenChallenged}
                  onChange={e => updateField('whenChallenged', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-100 placeholder-gray-500"
                  placeholder="Behavior when confronted..."
                />
              </div>
            </div>
          </section>

          {/* Personality */}
          <section className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-xl font-bold mb-4" style={{ color: colors.text }}>Personality</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Greatest Fear</label>
                <input
                  type="text"
                  value={currentNpc.greatestFear}
                  onChange={e => updateField('greatestFear', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-100 placeholder-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Greatest Strength</label>
                <input
                  type="text"
                  value={currentNpc.greatestStrength}
                  onChange={e => updateField('greatestStrength', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-100 placeholder-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Respects</label>
                <input
                  type="text"
                  value={currentNpc.respects}
                  onChange={e => updateField('respects', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-100 placeholder-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Despises</label>
                <input
                  type="text"
                  value={currentNpc.despises}
                  onChange={e => updateField('despises', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-100 placeholder-gray-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-400 mb-1">Signature Quote</label>
                <input
                  type="text"
                  value={currentNpc.quote}
                  onChange={e => updateField('quote', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-100 placeholder-gray-500"
                  placeholder="A memorable line..."
                />
              </div>
            </div>
          </section>

          {/* Debts Owed */}
          <section className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-xl font-bold mb-4" style={{ color: colors.text }}>Debts This NPC Owes</h2>
            {currentNpc.debtsOwed.map((debt, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={debt.creditor}
                  onChange={e => updateArrayField('debtsOwed', i, 'creditor', e.target.value)}
                  className="w-1/3 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-100 placeholder-gray-500"
                  placeholder="Creditor name"
                />
                <input
                  type="text"
                  value={debt.context}
                  onChange={e => updateArrayField('debtsOwed', i, 'context', e.target.value)}
                  className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-100 placeholder-gray-500"
                  placeholder="Why they owe..."
                />
                <button
                  onClick={() => removeArrayItem('debtsOwed', i)}
                  className="bg-red-600 hover:bg-red-500 px-3 rounded text-white"
                >×</button>
              </div>
            ))}
            <button
              onClick={() => addArrayItem('debtsOwed', { creditor: '', context: '' })}
              className="text-emerald-400 hover:text-emerald-300 text-sm"
            >+ Add Debt</button>
          </section>

          {/* Debts Owed To */}
          <section className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-xl font-bold mb-4" style={{ color: colors.text }}>Debts Owed TO This NPC</h2>
            {currentNpc.debtsOwedTo.map((debt, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={debt.debtor}
                  onChange={e => updateArrayField('debtsOwedTo', i, 'debtor', e.target.value)}
                  className="w-1/3 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-100 placeholder-gray-500"
                  placeholder="Debtor name"
                />
                <input
                  type="text"
                  value={debt.context}
                  onChange={e => updateArrayField('debtsOwedTo', i, 'context', e.target.value)}
                  className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-100 placeholder-gray-500"
                  placeholder="Why they owe..."
                />
                <button
                  onClick={() => removeArrayItem('debtsOwedTo', i)}
                  className="bg-red-600 hover:bg-red-500 px-3 rounded text-white"
                >×</button>
              </div>
            ))}
            <button
              onClick={() => addArrayItem('debtsOwedTo', { debtor: '', context: '' })}
              className="text-emerald-400 hover:text-emerald-300 text-sm"
            >+ Add Debt</button>
          </section>

          {/* Relationships */}
          <section className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-xl font-bold mb-4" style={{ color: colors.text }}>Key Relationships</h2>
            {currentNpc.relationships.map((rel, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={rel.name}
                  onChange={e => updateArrayField('relationships', i, 'name', e.target.value)}
                  className="w-1/3 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-100 placeholder-gray-500"
                  placeholder="Name"
                />
                <input
                  type="text"
                  value={rel.description}
                  onChange={e => updateArrayField('relationships', i, 'description', e.target.value)}
                  className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-100 placeholder-gray-500"
                  placeholder="Nature of relationship..."
                />
                <button
                  onClick={() => removeArrayItem('relationships', i)}
                  className="bg-red-600 hover:bg-red-500 px-3 rounded text-white"
                >×</button>
              </div>
            ))}
            <button
              onClick={() => addArrayItem('relationships', { name: '', description: '' })}
              className="text-emerald-400 hover:text-emerald-300 text-sm"
            >+ Add Relationship</button>
          </section>

          {/* Story Hooks */}
          <section className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-xl font-bold mb-4" style={{ color: colors.text }}>Story Hooks</h2>
            {currentNpc.storyHooks.map((hook, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={hook}
                  onChange={e => updateArrayField('storyHooks', i, null, e.target.value)}
                  className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-100 placeholder-gray-500"
                  placeholder="A potential plot thread..."
                />
                <button
                  onClick={() => removeArrayItem('storyHooks', i)}
                  className="bg-red-600 hover:bg-red-500 px-3 rounded text-white"
                >×</button>
              </div>
            ))}
            <button
              onClick={() => addArrayItem('storyHooks', '')}
              className="text-emerald-400 hover:text-emerald-300 text-sm"
            >+ Add Hook</button>
          </section>

          {/* Session Notes */}
          <section className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-xl font-bold mb-4" style={{ color: colors.text }}>Session Notes</h2>
            <textarea
              value={currentNpc.sessionNotes}
              onChange={e => updateField('sessionNotes', e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 h-32 text-gray-100 placeholder-gray-500"
              placeholder="Notes from play sessions..."
            />
          </section>

          {/* Save Button */}
          <div className="flex justify-end gap-4">
            <button
              onClick={() => setView('list')}
              className="px-6 py-3 rounded text-gray-400 hover:text-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveNpc}
              className="bg-emerald-600 hover:bg-emerald-500 px-6 py-3 rounded font-bold text-white"
            >
              {editingId ? 'Save Changes' : 'Create NPC'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
