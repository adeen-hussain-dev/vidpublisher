'use client';
import { useState, useEffect, useRef } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// ─── Icons ────────────────────────────────────────────────────────────────────
const Icon = ({ name, size = 20 }) => {
  const icons = {
    upload: <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
    play: <svg width={size} height={size} fill="currentColor" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21"/></svg>,
    pause: <svg width={size} height={size} fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>,
    trash: <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>,
    check: <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>,
    music: <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>,
    video: <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="7" width="15" height="10" rx="1"/><polygon points="17 12 22 8 22 16 17 12"/></svg>,
    close: <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    fb: <svg width={size} height={size} viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
    yt: <svg width={size} height={size} viewBox="0 0 24 24" fill="#FF0000"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>,
  };
  return icons[name] || null;
};

// ─── Music Card ───────────────────────────────────────────────────────────────
function MusicCard({ track, selected, onSelect, onDelete, apiBase }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);

  const toggle = (e) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  };

  useEffect(() => {
    if (!selected && audioRef.current) { audioRef.current.pause(); setPlaying(false); }
  }, [selected]);

  return (
    <div onClick={() => onSelect(track.filename)} style={{
      background: selected ? 'rgba(255,60,0,0.12)' : 'var(--surface2)',
      border: `2px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
      borderRadius: 'var(--radius)',
      padding: '12px 14px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      transition: 'all 0.2s',
      position: 'relative',
    }}>
      <audio ref={audioRef} src={`${apiBase}/music/${encodeURIComponent(track.filename)}`} onEnded={() => setPlaying(false)} />
      <button onClick={toggle} style={{
        width: 36, height: 36, borderRadius: '50%',
        background: playing ? 'var(--accent)' : 'var(--border)',
        border: 'none', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, transition: 'background 0.2s',
      }}>
        <Icon name={playing ? 'pause' : 'play'} size={14} />
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: selected ? 'var(--accent)' : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {track.name}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--font-mono)' }}>
          {playing ? '▶ playing...' : 'tap to select'}
        </div>
      </div>
      {selected && <div style={{ color: 'var(--accent)', flexShrink: 0 }}><Icon name="check" size={18} /></div>}
      <button onClick={e => { e.stopPropagation(); onDelete(track.filename); }} style={{
        background: 'none', border: 'none', color: 'var(--text2)',
        flexShrink: 0, padding: 4, borderRadius: 4,
        display: 'flex', alignItems: 'center',
      }}>
        <Icon name="trash" size={14} />
      </button>
    </div>
  );
}

// ─── Page Selector ────────────────────────────────────────────────────────────
function PageCheckbox({ page, checked, onChange }) {
  const colors = { facebook: '#1877F2', youtube: '#FF0000' };
  return (
    <div onClick={() => onChange(page.id)} style={{
      background: checked ? `rgba(${page.platform === 'facebook' ? '24,119,242' : '255,0,0'},0.12)` : 'var(--surface2)',
      border: `2px solid ${checked ? colors[page.platform] : 'var(--border)'}`,
      borderRadius: 'var(--radius)',
      padding: '10px 14px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      transition: 'all 0.2s',
    }}>
      <span style={{ fontSize: 18 }}>{page.icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{page.name}</div>
        <div style={{ fontSize: 11, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Icon name={page.platform === 'facebook' ? 'fb' : 'yt'} size={11} />
          {page.platform === 'facebook' ? 'Facebook' : 'YouTube'}
          {!page.configured && <span style={{ color: 'var(--error)', marginLeft: 4 }}>• not configured</span>}
        </div>
      </div>
      {checked && <div style={{ color: colors[page.platform] }}><Icon name="check" size={18} /></div>}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function Home() {
  const [pages, setPages] = useState([]);
  const [music, setMusic] = useState([]);
  const [videoFile, setVideoFile] = useState(null);
  const [videoPrev, setVideoPrev] = useState(null);
  const [selectedPages, setSelectedPages] = useState([]);
  const [selectedMusic, setSelectedMusic] = useState(null);
  const [addSubtitles, setAddSubtitles] = useState(true);
  const [script, setScript] = useState('');
  const [status, setStatus] = useState(null); // null | 'loading' | 'success' | 'error'
  const [results, setResults] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [uploadingMusic, setUploadingMusic] = useState(false);
  const videoInputRef = useRef();
  const musicInputRef = useRef();

  // Load pages + music on mount
  useEffect(() => {
    fetch(`${API}/api/pages`).then(r => r.json()).then(setPages).catch(() => {});
    loadMusic();
  }, []);

  const loadMusic = () => {
    fetch(`${API}/api/music`).then(r => r.json()).then(setMusic).catch(() => {});
  };

  const handleVideoChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setVideoFile(f);
    setVideoPrev(URL.createObjectURL(f));
  };

  const togglePage = (id) => {
    setSelectedPages(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const handleMusicUpload = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setUploadingMusic(true);
    const fd = new FormData();
    fd.append('music', f);
    await fetch(`${API}/api/music/upload`, { method: 'POST', body: fd });
    loadMusic();
    setUploadingMusic(false);
  };

  const deleteMusic = async (filename) => {
    await fetch(`${API}/api/music/${encodeURIComponent(filename)}`, { method: 'DELETE' });
    if (selectedMusic === filename) setSelectedMusic(null);
    loadMusic();
  };

  const handlePublish = async () => {
    if (!videoFile) return alert('Please upload a video first.');
    if (selectedPages.length === 0) return alert('Select at least one page.');
    if (!script.trim()) return alert('Please enter a description for title & hashtag generation.');

    setStatus('loading');
    setResults([]);
    setErrorMsg('');

    const fd = new FormData();
    fd.append('video', videoFile);
    fd.append('pageIds', JSON.stringify(selectedPages));
    fd.append('script', script);
    fd.append('addSubtitles', String(addSubtitles));
    if (selectedMusic) fd.append('musicFilename', selectedMusic);

    try {
      const res = await fetch(`${API}/api/publish`, { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success) {
        setStatus('success');
        setResults(data.results || []);
      } else {
        setStatus('error');
        setErrorMsg(data.error || 'Unknown error');
      }
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message);
    }
  };

  const reset = () => {
    setStatus(null);
    setVideoFile(null);
    setVideoPrev(null);
    setSelectedPages([]);
    setSelectedMusic(null);
    setScript('');
    setResults([]);
  };

  // ─── Loading Screen ─────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: 24 }}>
        <div style={{ width: 48, height: 48, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent)' }}>Publishing...</div>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 6, fontFamily: 'var(--font-mono)' }}>
            {addSubtitles ? 'transcribing → processing → posting' : 'processing → posting'}
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text2)', fontFamily: 'var(--font-mono)' }}>This takes 1-3 minutes</div>
      </div>
    );
  }

  // ─── Result Screen ──────────────────────────────────────────────────────
  if (status === 'success' || status === 'error') {
    return (
      <div style={{ minHeight: '100vh', padding: '24px 16px', maxWidth: 480, margin: '0 auto' }}>
        <div style={{ animation: 'slide-up 0.4s ease' }}>
          <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 4, color: status === 'success' ? 'var(--success)' : 'var(--error)' }}>
            {status === 'success' ? '✅ Published!' : '❌ Failed'}
          </div>
          {status === 'error' && (
            <div style={{ background: 'rgba(255,23,68,0.1)', border: '1px solid var(--error)', borderRadius: 'var(--radius)', padding: 12, marginBottom: 16, fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--error)' }}>
              {errorMsg}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
            {results.map((r, i) => (
              <div key={i} style={{
                background: r.status === 'success' ? 'rgba(0,200,83,0.08)' : 'rgba(255,23,68,0.08)',
                border: `1px solid ${r.status === 'success' ? 'var(--success)' : 'var(--error)'}`,
                borderRadius: 'var(--radius)', padding: '10px 14px',
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {r.status === 'success' ? '✅' : '❌'}
                  {pages.find(p => p.id === r.pageId)?.name || r.pageId}
                  <span style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'capitalize' }}>({r.platform})</span>
                </div>
                {r.id && <div style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>ID: {r.id}</div>}
                {r.error && <div style={{ fontSize: 11, color: 'var(--error)', marginTop: 2 }}>{r.error}</div>}
              </div>
            ))}
          </div>
          <button onClick={reset} style={{
            marginTop: 24, width: '100%', padding: '14px',
            background: 'var(--accent)', border: 'none', borderRadius: 'var(--radius)',
            color: '#fff', fontSize: 15, fontWeight: 800, letterSpacing: '0.04em',
          }}>
            PUBLISH ANOTHER
          </button>
        </div>
      </div>
    );
  }

  // ─── Main Form ──────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', padding: '0 0 40px' }}>
      {/* Header */}
      <div style={{ background: 'var(--surface)', borderBottom: '2px solid var(--accent)', padding: '16px 20px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 480, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)' }} />
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '0.05em' }}>VIDPUBLISHER</div>
          <div style={{ marginLeft: 'auto', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text2)' }}>
            {pages.filter(p => p.configured).length}/{pages.length} connected
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 28 }}>

        {/* Video Upload */}
        <Section label="01 — VIDEO" icon="video">
          <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoChange} style={{ display: 'none' }} />
          {!videoFile ? (
            <button onClick={() => videoInputRef.current?.click()} style={{
              width: '100%', padding: '32px 16px',
              background: 'var(--surface2)', border: '2px dashed var(--border)',
              borderRadius: 'var(--radius)', color: 'var(--text2)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
              transition: 'all 0.2s',
            }}>
              <Icon name="upload" size={28} />
              <span style={{ fontSize: 13, fontWeight: 700 }}>TAP TO UPLOAD VIDEO</span>
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}>MP4, MOV, WEBM</span>
            </button>
          ) : (
            <div style={{ position: 'relative' }}>
              <video src={videoPrev} controls style={{ width: '100%', borderRadius: 'var(--radius)', background: '#000', maxHeight: 260 }} />
              <button onClick={() => { setVideoFile(null); setVideoPrev(null); }} style={{
                position: 'absolute', top: 8, right: 8,
                background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '50%',
                width: 30, height: 30, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name="close" size={14} />
              </button>
              <div style={{ fontSize: 12, color: 'var(--text2)', fontFamily: 'var(--font-mono)', marginTop: 6 }}>
                {videoFile.name} · {(videoFile.size / 1024 / 1024).toFixed(1)}MB
              </div>
            </div>
          )}
        </Section>

        {/* Description */}
        <Section label="02 — DESCRIPTION" icon={null}>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8, fontFamily: 'var(--font-mono)' }}>
            Used to generate title + 20 hashtags (not shown on video)
          </div>
          <textarea
            value={script}
            onChange={e => setScript(e.target.value)}
            placeholder="Black warrior ants vs giant scorpion in the desert..."
            style={{
              width: '100%', minHeight: 80, padding: '10px 12px',
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', color: 'var(--text)', fontSize: 13,
              resize: 'vertical', lineHeight: 1.5,
            }}
          />
        </Section>

        {/* Post To */}
        <Section label="03 — POST TO" icon={null}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pages.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text2)', fontFamily: 'var(--font-mono)', padding: 12 }}>
                No pages configured. Add them in backend/src/pages.js
              </div>
            ) : pages.map(page => (
              <PageCheckbox key={page.id} page={page} checked={selectedPages.includes(page.id)} onChange={togglePage} />
            ))}
          </div>
        </Section>

        {/* Subtitles Toggle */}
        <Section label="04 — SUBTITLES" icon={null}>
          <div style={{ display: 'flex', gap: 10 }}>
            {[true, false].map(val => (
              <button key={String(val)} onClick={() => setAddSubtitles(val)} style={{
                flex: 1, padding: '12px 0', fontWeight: 800, fontSize: 13,
                letterSpacing: '0.05em',
                background: addSubtitles === val ? 'var(--accent)' : 'var(--surface2)',
                color: addSubtitles === val ? '#fff' : 'var(--text2)',
                border: `2px solid ${addSubtitles === val ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 'var(--radius)', transition: 'all 0.2s',
              }}>
                {val ? 'YES — AUTO' : 'NO'}
              </button>
            ))}
          </div>
          {addSubtitles && (
            <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 6, fontFamily: 'var(--font-mono)' }}>
              Whisper will auto-transcribe your video audio
            </div>
          )}
        </Section>

        {/* Background Music */}
        <Section label="05 — BACKGROUND MUSIC" icon="music">
          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10, fontFamily: 'var(--font-mono)' }}>
            Mixed at 25% volume · tap to preview & select
          </div>

          {/* Music list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            {music.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text2)', fontFamily: 'var(--font-mono)', padding: '12px 0' }}>
                No music uploaded yet
              </div>
            ) : music.map(track => (
              <MusicCard
                key={track.filename}
                track={track}
                selected={selectedMusic === track.filename}
                onSelect={f => setSelectedMusic(selectedMusic === f ? null : f)}
                onDelete={deleteMusic}
                apiBase={API}
              />
            ))}
          </div>

          {/* Upload new music */}
          <input ref={musicInputRef} type="file" accept="audio/*" onChange={handleMusicUpload} style={{ display: 'none' }} />
          <button onClick={() => musicInputRef.current?.click()} disabled={uploadingMusic} style={{
            width: '100%', padding: '10px',
            background: 'none', border: '1px dashed var(--border)',
            borderRadius: 'var(--radius)', color: 'var(--text2)',
            fontSize: 12, fontWeight: 700, letterSpacing: '0.04em',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <Icon name="upload" size={14} />
            {uploadingMusic ? 'UPLOADING...' : 'UPLOAD NEW TRACK'}
          </button>
          {selectedMusic && (
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--accent)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Icon name="music" size={12} /> {selectedMusic.replace(/\.[^.]+$/, '')}
              <button onClick={() => setSelectedMusic(null)} style={{ background: 'none', border: 'none', color: 'var(--text2)', marginLeft: 4, cursor: 'pointer' }}>✕</button>
            </div>
          )}
        </Section>

        {/* Publish Button */}
        <button onClick={handlePublish} disabled={!videoFile || selectedPages.length === 0} style={{
          width: '100%', padding: '18px',
          background: (!videoFile || selectedPages.length === 0) ? 'var(--surface2)' : 'var(--accent)',
          border: 'none', borderRadius: 'var(--radius)',
          color: (!videoFile || selectedPages.length === 0) ? 'var(--text2)' : '#fff',
          fontSize: 17, fontWeight: 800, letterSpacing: '0.06em',
          transition: 'all 0.2s',
        }}>
          🚀 PUBLISH VIDEO
        </button>
      </div>
    </div>
  );
}

function Section({ label, icon, children }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
          {label}
        </div>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>
      {children}
    </div>
  );
}
