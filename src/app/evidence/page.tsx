'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  X,
  Trash2,
  Building2,
  AlertCircle,
  RefreshCw,
  Upload,
  Check,
  ImageOff,
  Clock,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  WifiOff,
  Layers,
  CloudOff,
} from 'lucide-react';

const formatDateTime = (fechaStr: string) => {
  const d = new Date(fechaStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

const formatTime = (fechaStr: string) => {
  const d = new Date(fechaStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
};

// Clave local yyyy-mm-dd (sin corrimiento de zona)
const dayKey = (fechaStr: string) => {
  const d = new Date(fechaStr);
  if (isNaN(d.getTime())) return 'sin-fecha';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const dayLabel = (fechaStr: string) => {
  const d = new Date(fechaStr);
  if (isNaN(d.getTime())) return 'Sin fecha';
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  if (dayKey(fechaStr) === dayKey(today.toISOString())) return 'Hoy';
  if (dayKey(fechaStr) === dayKey(yest.toISOString())) return 'Ayer';
  return d.toLocaleDateString('es-CO', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
};

const getPhotos = (ev: any): string[] =>
  ev.fotos && ev.fotos.length ? ev.fotos : (ev.foto_url ? [ev.foto_url] : []);

type DatePreset = 'all' | 'today' | 'week' | 'month';

export default function EvidencePage() {
  const { clients, evidence, fetchClients, fetchEvidence, addEvidence, deleteEvidence } = useStore();

  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  // Modal de captura
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [stage, setStage] = useState<'capture' | 'details'>('capture');
  const [captured, setCaptured] = useState<string[]>([]);
  const [capturedAt, setCapturedAt] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Filtros
  const [providerFilter, setProviderFilter] = useState<string>('all'); // all | <id> | general
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [search, setSearch] = useState('');

  // Visor
  const [viewing, setViewing] = useState<any>(null);
  const [viewIndex, setViewIndex] = useState(0);

  // Menú desplegable propio del filtro de proveedor
  const [provOpen, setProvOpen] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const load = async () => {
      await Promise.all([fetchClients(), fetchEvidence()]);
      setIsLoadingList(false);
    };
    load();
  }, [fetchClients, fetchEvidence]);

  // Estado de conexión
  useEffect(() => {
    if (typeof navigator !== 'undefined') setIsOnline(navigator.onLine);
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  // Cámara en vivo (activa por defecto en la etapa de captura)
  useEffect(() => {
    let active = true;
    const start = async () => {
      if (!isModalOpen || stage !== 'capture') return;
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setCameraError('Este dispositivo no soporta cámara en el navegador. Sube una foto desde tu galería.');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        if (!active) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCameraError(null);
      } catch {
        setCameraError('No se pudo acceder a la cámara. Revisa los permisos o sube una foto desde tu galería.');
      }
    };
    start();
    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [isModalOpen, stage]);

  const openModal = () => {
    setStage('capture');
    setCaptured([]);
    setCapturedAt(null);
    setSelectedClientId('');
    setDescripcion('');
    setCameraError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCaptured([]);
    setCapturedAt(null);
  };

  const compressToDataUrl = (source: CanvasImageSource, srcW: number, srcH: number) => {
    const MAX = 1280;
    let w = srcW, h = srcH;
    if (w > MAX) { h = h * (MAX / w); w = MAX; }
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d')?.drawImage(source, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', 0.6);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const dataUrl = compressToDataUrl(video, video.videoWidth, video.videoHeight);
    setCaptured((prev) => [...prev, dataUrl]);
    if (!capturedAt) setCapturedAt(new Date().toISOString());
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const dataUrl = compressToDataUrl(img, img.width, img.height);
          setCaptured((prev) => [...prev, dataUrl]);
          setCapturedAt((prev) => prev || new Date().toISOString());
        };
        img.src = ev.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removeCaptured = (idx: number) => {
    setCaptured((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (captured.length === 0) return;
    setIsSaving(true);
    setCameraError(null);
    try {
      await addEvidence({
        cliente_id: selectedClientId || null,
        descripcion: descripcion.trim(),
        fotos: captured,
        fecha: capturedAt || new Date().toISOString(),
      });
      closeModal();
    } catch (err: any) {
      setCameraError(err.message || 'Error al guardar la evidencia.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Eliminar esta evidencia? Esta acción no se puede deshacer.')) {
      try {
        await deleteEvidence(id);
        if (viewing?.id === id) setViewing(null);
      } catch (err: any) {
        alert(err.message || 'Error al eliminar la evidencia.');
      }
    }
  };

  const providerName = (clienteId: string | null) =>
    clienteId ? clients.find((c) => c.id === clienteId)?.nombre || 'Proveedor' : null;

  // --- FILTRADO ---
  const filtered = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const weekAgo = startOfToday - 6 * 24 * 60 * 60 * 1000;
    const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).getTime();
    const q = search.trim().toLowerCase();

    return evidence.filter((ev) => {
      // Proveedor
      if (providerFilter === 'general' && ev.cliente_id) return false;
      if (providerFilter !== 'all' && providerFilter !== 'general' && ev.cliente_id !== providerFilter) return false;

      // Fecha
      const t = new Date(ev.fecha).getTime();
      if (datePreset === 'today' && t < startOfToday) return false;
      if (datePreset === 'week' && t < weekAgo) return false;
      if (datePreset === 'month' && t < monthAgo) return false;

      // Búsqueda
      if (q) {
        const name = (providerName(ev.cliente_id) || '').toLowerCase();
        const desc = (ev.descripcion || '').toLowerCase();
        if (!name.includes(q) && !desc.includes(q)) return false;
      }
      return true;
    });
  }, [evidence, providerFilter, datePreset, search, clients]);

  // Agrupar por día
  const groups = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const ev of filtered) {
      const k = dayKey(ev.fecha);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(ev);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [filtered]);

  // Resumen
  const summary = useMemo(() => {
    const proveedores = new Set(filtered.filter((e) => e.cliente_id).map((e) => e.cliente_id));
    const totalFotos = filtered.reduce((n, e) => n + getPhotos(e).length, 0);
    return { evidencias: filtered.length, proveedores: proveedores.size, fotos: totalFotos };
  }, [filtered]);

  const pendingCount = evidence.filter((e) => e._pending).length;

  const openViewer = (ev: any) => { setViewing(ev); setViewIndex(0); };
  const viewerPhotos = viewing ? getPhotos(viewing) : [];

  const datePresets: { id: DatePreset; label: string }[] = [
    { id: 'all', label: 'Todo' },
    { id: 'today', label: 'Hoy' },
    { id: 'week', label: '7 días' },
    { id: 'month', label: 'Mes' },
  ];

  return (
    <div className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full flex flex-col space-y-5">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold text-blue-400 uppercase tracking-[0.22em]">Registro Fotográfico</span>
          <h1 className="text-2xl md:text-3xl font-display font-semibold text-slate-50 tracking-tight mt-1">Evidencias</h1>
          <p className="text-sm text-slate-400 mt-0.5">Fotos con fecha para el control de entregas e inventario.</p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold px-5 py-3 rounded-xl text-sm transition-all cursor-pointer shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30 shrink-0"
        >
          <Camera size={18} />
          Agregar Evidencia
        </button>
      </div>

      {/* Indicadores de estado (offline / pendientes) */}
      {(!isOnline || pendingCount > 0) && (
        <div className="flex flex-wrap gap-2">
          {!isOnline && (
            <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/25">
              <WifiOff size={13} />
              Sin conexión — las evidencias se guardan y se suben al reconectar.
            </div>
          )}
          {pendingCount > 0 && (
            <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/25">
              <CloudOff size={13} />
              {pendingCount} evidencia{pendingCount === 1 ? '' : 's'} pendiente{pendingCount === 1 ? '' : 's'} de sincronizar
            </div>
          )}
        </div>
      )}

      {/* Resumen */}
      {!isLoadingList && evidence.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Evidencias', value: summary.evidencias },
            { label: 'Proveedores', value: summary.proveedores },
            { label: 'Fotos', value: summary.fotos },
          ].map((s) => (
            <div key={s.label} className="glass-card rounded-2xl px-4 py-3 text-center">
              <span className="block text-2xl font-bold text-slate-50 tracking-tight">{s.value}</span>
              <span className="block text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      {!isLoadingList && evidence.length > 0 && (
        <div className="flex flex-col md:flex-row gap-3">
          {/* Búsqueda */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              type="text"
              placeholder="Buscar por proveedor o nota..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950/60 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
            />
          </div>
          {/* Proveedor (desplegable propio, no se sale de la pantalla) */}
          <div className="relative md:w-52 shrink-0">
            <button
              type="button"
              onClick={() => setProvOpen((o) => !o)}
              className="w-full flex items-center justify-between gap-2 bg-slate-950/60 border border-white/10 rounded-xl py-2.5 px-3 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
            >
              <span className="truncate">
                {providerFilter === 'all'
                  ? 'Todos los proveedores'
                  : providerFilter === 'general'
                    ? 'Sin proveedor'
                    : (clients.find((c) => c.id === providerFilter)?.nombre || 'Proveedor')}
              </span>
              <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${provOpen ? 'rotate-180' : ''}`} />
            </button>

            {provOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setProvOpen(false)} />
                <div className="absolute left-0 right-0 mt-2 z-50 max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-slate-900 shadow-2xl p-1">
                  {[
                    { value: 'all', label: 'Todos los proveedores' },
                    { value: 'general', label: 'Sin proveedor' },
                    ...clients.map((c) => ({ value: c.id, label: c.nombre })),
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => { setProviderFilter(opt.value); setProvOpen(false); }}
                      className={`w-full flex items-center justify-between gap-2 text-left px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                        providerFilter === opt.value ? 'bg-blue-600 text-white' : 'text-slate-200 hover:bg-white/5'
                      }`}
                    >
                      <span className="truncate">{opt.label}</span>
                      {providerFilter === opt.value && <Check size={15} className="shrink-0" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          {/* Rango de fecha */}
          <div className="flex bg-slate-950/60 border border-white/10 rounded-xl p-1 shrink-0">
            {datePresets.map((p) => (
              <button
                key={p.id}
                onClick={() => setDatePreset(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  datePreset === p.id ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Galería agrupada por día */}
      {isLoadingList ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 animate-pulse">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="aspect-square rounded-2xl bg-slate-800/40 border border-white/5" />
          ))}
        </div>
      ) : evidence.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-16 glass-card rounded-3xl">
          <div className="h-16 w-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
            <ImageOff size={30} />
          </div>
          <p className="text-base font-semibold text-slate-200">Aún no hay evidencias</p>
          <p className="text-sm text-slate-500 mt-1 max-w-xs">Presiona &quot;Agregar Evidencia&quot; para tomar tu primera fotografía con fecha.</p>
          <button onClick={openModal} className="mt-5 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2.5 rounded-xl text-sm cursor-pointer transition-all">
            <Camera size={16} /> Tomar foto
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 glass-card rounded-3xl">
          <Search className="mx-auto text-slate-600 mb-3" size={30} />
          <p className="text-sm text-slate-300 font-semibold">Sin resultados</p>
          <p className="text-xs text-slate-500 mt-1">Prueba con otro proveedor, fecha o término de búsqueda.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(([key, items]) => (
            <div key={key} className="space-y-3">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-bold text-slate-200 capitalize">{dayLabel(items[0].fecha)}</h2>
                <span className="text-[10px] font-bold text-slate-500 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                  {items.length} evidencia{items.length === 1 ? '' : 's'}
                </span>
                <div className="flex-1 h-px bg-white/5" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                {items.map((ev) => {
                  const photos = getPhotos(ev);
                  return (
                    <div
                      key={ev.id}
                      className="group relative aspect-square rounded-2xl overflow-hidden border border-white/8 bg-slate-900 cursor-pointer hover:border-blue-500/40 transition-all"
                      onClick={() => openViewer(ev)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photos[0]} alt="Evidencia" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />

                      {/* Contador de fotos */}
                      {photos.length > 1 && (
                        <span className="absolute top-2 left-2 inline-flex items-center gap-1 bg-black/60 backdrop-blur text-white text-[10px] font-bold px-2 py-0.5 rounded-lg">
                          <Layers size={11} /> {photos.length}
                        </span>
                      )}

                      {/* Pendiente de sincronizar */}
                      {ev._pending && (
                        <span className="absolute top-2 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 bg-amber-500/90 text-black text-[9px] font-bold px-2 py-0.5 rounded-lg">
                          <CloudOff size={10} /> Pendiente
                        </span>
                      )}

                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-3 pt-8">
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-200 font-medium">
                          <Clock size={11} className="text-blue-300 shrink-0" />
                          <span className="truncate">{formatTime(ev.fecha)}</span>
                        </div>
                        {providerName(ev.cliente_id) && (
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-300 mt-1">
                            <Building2 size={11} className="text-emerald-300 shrink-0" />
                            <span className="truncate">{providerName(ev.cliente_id)}</span>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(ev.id); }}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 backdrop-blur text-slate-300 hover:bg-red-600 hover:text-white transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                        title="Eliminar"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: CAPTURA DE EVIDENCIA */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => !isSaving && closeModal()}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="relative w-full md:max-w-lg bg-slate-900 border-t md:border border-white/10 rounded-t-3xl md:rounded-3xl p-5 md:p-6 shadow-2xl z-10 flex flex-col max-h-[100vh] md:max-h-[92vh] overflow-hidden"
            >
              <div className="flex justify-between items-center mb-4 border-b border-white/8 pb-3">
                <h2 className="text-base font-bold text-slate-50 flex items-center gap-2">
                  <Camera size={18} className="text-blue-400" />
                  {stage === 'capture' ? 'Tomar Fotografías' : 'Guardar Evidencia'}
                </h2>
                <button onClick={() => !isSaving && closeModal()} className="p-1 rounded-full bg-white/5 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-0.5 space-y-4">
                {stage === 'capture' ? (
                  <>
                    {/* Cámara en vivo */}
                    <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-black border border-white/10">
                      {cameraError ? (
                        <div className="h-full w-full flex flex-col items-center justify-center text-center p-6">
                          <AlertCircle className="text-amber-400 mb-3" size={32} />
                          <p className="text-xs text-slate-300 max-w-xs">{cameraError}</p>
                        </div>
                      ) : (
                        <>
                          <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
                          <div className="absolute inset-0 pointer-events-none border-[3px] border-white/10 rounded-2xl" />
                        </>
                      )}
                    </div>

                    {/* Miniaturas capturadas */}
                    {captured.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {captured.map((src, idx) => (
                          <div key={idx} className="relative shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={src} alt={`Foto ${idx + 1}`} className="h-16 w-16 object-cover rounded-lg border border-white/10" />
                            <button
                              onClick={() => removeCaptured(idx)}
                              className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-600 text-white flex items-center justify-center cursor-pointer"
                            >
                              <X size={11} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Controles */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={capturePhoto}
                        disabled={!!cameraError}
                        className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all cursor-pointer shadow-lg shadow-blue-600/20"
                      >
                        <Camera size={18} /> Capturar
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 font-semibold py-3.5 px-4 rounded-xl transition-all cursor-pointer"
                        title="Subir desde galería"
                      >
                        <Upload size={18} />
                      </button>
                      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" multiple onChange={handleFileSelect} className="hidden" />
                    </div>

                    <button
                      onClick={() => setStage('details')}
                      disabled={captured.length === 0}
                      className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-40 disabled:cursor-not-allowed text-slate-100 font-bold py-3 rounded-xl transition-all cursor-pointer"
                    >
                      Continuar {captured.length > 0 && `(${captured.length} foto${captured.length === 1 ? '' : 's'})`}
                      <ChevronRight size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    {/* Miniaturas resumen */}
                    <div className="grid grid-cols-4 gap-2">
                      {captured.map((src, idx) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={idx} src={src} alt={`Foto ${idx + 1}`} className="aspect-square w-full object-cover rounded-lg border border-white/10" />
                      ))}
                    </div>

                    {capturedAt && (
                      <div className="inline-flex items-center gap-1.5 text-xs text-slate-300 bg-white/5 px-3 py-1.5 rounded-lg">
                        <Clock size={13} className="text-blue-300" />
                        {formatDateTime(capturedAt)}
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Proveedor (opcional)</label>
                      <select
                        value={selectedClientId}
                        onChange={(e) => setSelectedClientId(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 px-4 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-all"
                      >
                        <option value="">— Evidencia general (sin proveedor) —</option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>{c.nombre}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nota / Descripción (opcional)</label>
                      <input
                        type="text"
                        placeholder="Ej. Entrega de 40 litros, cantina #3..."
                        value={descripcion}
                        onChange={(e) => setDescripcion(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 px-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
                      />
                    </div>

                    {cameraError && (
                      <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                        <AlertCircle size={16} /><span>{cameraError}</span>
                      </div>
                    )}

                    <div className="flex gap-3 pt-1">
                      <button
                        onClick={() => setStage('capture')}
                        disabled={isSaving}
                        className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 font-semibold py-3.5 px-4 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                      >
                        <ChevronLeft size={16} /> Atrás
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3.5 rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                      >
                        {isSaving ? (
                          <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <><Check size={18} /> Guardar Evidencia</>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* VISOR (LIGHTBOX) CON CARRUSEL */}
      <AnimatePresence>
        {viewing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setViewing(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative z-10 w-full max-w-2xl flex flex-col"
            >
              <div className="rounded-2xl overflow-hidden border border-white/10 bg-slate-900 shadow-2xl">
                <div className="relative bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={viewerPhotos[viewIndex]} alt="Evidencia" className="w-full max-h-[65vh] object-contain" />
                  {viewerPhotos.length > 1 && (
                    <>
                      <button
                        onClick={() => setViewIndex((i) => (i - 1 + viewerPhotos.length) % viewerPhotos.length)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/60 text-white flex items-center justify-center cursor-pointer hover:bg-black/80"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <button
                        onClick={() => setViewIndex((i) => (i + 1) % viewerPhotos.length)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/60 text-white flex items-center justify-center cursor-pointer hover:bg-black/80"
                      >
                        <ChevronRight size={18} />
                      </button>
                      <span className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full">
                        {viewIndex + 1} / {viewerPhotos.length}
                      </span>
                    </>
                  )}
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-slate-200 font-medium">
                    <Clock size={15} className="text-blue-400" />
                    {formatDateTime(viewing.fecha)}
                  </div>
                  {providerName(viewing.cliente_id) && (
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <Building2 size={15} className="text-emerald-400" />
                      {providerName(viewing.cliente_id)}
                    </div>
                  )}
                  {viewing.descripcion && (
                    <p className="text-sm text-slate-400 pt-1 border-t border-white/8">{viewing.descripcion}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center mt-3">
                <button
                  onClick={() => handleDelete(viewing.id)}
                  className="inline-flex items-center gap-2 bg-red-600/90 hover:bg-red-600 text-white font-semibold px-4 py-2.5 rounded-xl text-sm cursor-pointer transition-all"
                >
                  <Trash2 size={15} /> Eliminar
                </button>
                <button
                  onClick={() => setViewing(null)}
                  className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 text-slate-100 font-semibold px-4 py-2.5 rounded-xl text-sm cursor-pointer transition-all"
                >
                  <X size={15} /> Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
