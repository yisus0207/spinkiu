'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/store/useStore';
import { motion } from 'framer-motion';
import { 
  Users, 
  Receipt, 
  Clock, 
  DollarSign, 
  ArrowUpRight, 
  Plus, 
  UserPlus,
  ArrowRight
} from 'lucide-react';

const formatCOP = (val: number, showSign = false) => {
  const formattedVal = Math.abs(val).toLocaleString('es-CO', { minimumFractionDigits: 0 });
  if (val < 0) {
    return `- $ ${formattedVal}`;
  }
  return showSign ? `+ $ ${formattedVal}` : `$ ${formattedVal}`;
};

export default function Dashboard() {
  const { 
    profile, 
    clients: providers, 
    invoices, 
    fetchClients: fetchProviders, 
    fetchInvoices 
  } = useStore();

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      await Promise.all([
        fetchProviders(),
        fetchInvoices()
      ]);
      setIsLoading(false);
    };
    loadDashboardData();
  }, [fetchProviders, fetchInvoices]);

  if (isLoading) {
    return (
      <div className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full space-y-6 animate-pulse">
        {/* Header Skeleton */}
        <div className="space-y-2">
          <div className="h-3 bg-zinc-800 rounded-md w-20"></div>
          <div className="h-8 bg-zinc-850 rounded-lg w-48"></div>
          <div className="h-4 bg-zinc-800 rounded-md w-80"></div>
        </div>

        {/* KPIs Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 h-32 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="h-3 bg-zinc-800 rounded-md w-24"></div>
                <div className="h-8 w-8 bg-zinc-850 rounded-xl"></div>
              </div>
              <div className="h-6 bg-zinc-850 rounded-md w-16"></div>
            </div>
          ))}
        </div>

        {/* Actions Skeleton */}
        <div className="space-y-3">
          <div className="h-3 bg-zinc-800 rounded-md w-28"></div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-16 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl"></div>
            ))}
          </div>
        </div>

        {/* Tables Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 h-64"></div>
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 h-64"></div>
        </div>
      </div>
    );
  }

  // --- CALCULO DE METRICAS ---
  const totalProviders = providers.length;
  const totalInvoices = invoices.length;
  
  const pendingInvoicesList = invoices.filter(i => i.estado === 'pendiente');
  const totalPendingInvoices = pendingInvoicesList.length;
  
  const totalUnpaidAmount = pendingInvoicesList.reduce((sum, inv) => sum + Number(inv.total), 0);

  // Tarjetas de Métricas
  const kpis = [
    {
      title: 'Total Proveedores',
      value: totalProviders,
      sub: 'Productores registrados',
      icon: Users,
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      href: '/providers'
    },
    {
      title: 'Liquidaciones Emitidas',
      value: totalInvoices,
      sub: 'Historial total de cuentas',
      icon: Receipt,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      href: '/providers'
    },
    {
      title: 'Cuentas Pendientes',
      value: totalPendingInvoices,
      sub: 'Liquidaciones por pagar',
      icon: Clock,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      href: '/providers'
    },
    {
      title: 'Pendiente de Pago',
      value: formatCOP(totalUnpaidAmount),
      sub: 'Saldo neto por liquidar',
      icon: DollarSign,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      href: '/providers'
    }
  ];

  // Obtener las últimas 3 facturas emitidas
  const recentInvoices = invoices.slice(0, 3);

  // Obtener los últimos 3 proveedores agregados
  const recentProviders = [...providers]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 3);

  return (
    <div className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full space-y-6">
      
      {/* Cabecera del Dashboard */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs font-bold text-blue-500 uppercase tracking-widest">Panel de Control</span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-zinc-100 tracking-tight mt-1">
            {profile?.nombre_negocio || 'Mi Negocio'}
          </h1>
          <p className="text-sm text-zinc-400 mt-0.5">Resumen de cuenta corriente y control de acopio de leche/queso</p>
        </div>
      </div>

      {/* Grid de Tarjetas KPIs con animación Framer Motion */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={kpi.title}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
              className="glass-card rounded-2xl p-4 flex flex-col justify-between min-h-[120px] relative overflow-hidden group cursor-pointer"
              onClick={() => window.location.href = kpi.href}
            >
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-zinc-400 group-hover:text-zinc-300 transition-colors">
                  {kpi.title}
                </span>
                <div className={`h-8 w-8 rounded-xl flex items-center justify-center border ${kpi.color}`}>
                  <Icon size={16} />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-xl md:text-2xl font-bold tracking-tight text-zinc-100">
                  {kpi.value}
                </span>
                <p className="text-[10px] text-zinc-500 mt-0.5 truncate">{kpi.sub}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Acciones Rápidas (Especial para móviles) */}
      <div>
        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Acciones Rápidas</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Link 
            href="/providers?action=new" 
            className="flex items-center gap-3 p-4 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-blue-500/40 text-zinc-200 hover:text-zinc-100 transition-all group"
          >
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
              <UserPlus size={18} />
            </div>
            <div className="overflow-hidden">
              <span className="text-sm font-semibold block">Crear Proveedor</span>
              <span className="text-[10px] text-zinc-500 block truncate">Registrar nuevo productor</span>
            </div>
          </Link>

          <Link 
            href="/providers" 
            className="flex items-center gap-3 p-4 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-purple-500/40 text-zinc-200 hover:text-zinc-100 transition-all group"
          >
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0">
              <Plus size={18} />
            </div>
            <div className="overflow-hidden">
              <span className="text-sm font-semibold block">Registrar Entrega</span>
              <span className="text-[10px] text-zinc-500 block truncate">Añadir leche o queso</span>
            </div>
          </Link>

          <Link 
            href="/providers" 
            className="flex items-center gap-3 p-4 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-emerald-500/40 text-zinc-200 hover:text-zinc-100 transition-all col-span-2 md:col-span-1 group"
          >
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <Receipt size={18} />
            </div>
            <div className="overflow-hidden">
              <span className="text-sm font-semibold block">Liquidar Cuenta</span>
              <span className="text-[10px] text-zinc-500 block truncate">Crear recibo y cerrar saldo</span>
            </div>
          </Link>
        </div>
      </div>

      {/* Grid de Secciones: Proveedores Recientes y Liquidaciones Recientes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Columna: Liquidaciones Recientes */}
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <Receipt size={16} className="text-blue-400" />
              Liquidaciones Recientes
            </h3>
            <Link href="/providers" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
              Ver todas <ArrowRight size={12} />
            </Link>
          </div>

          <div className="space-y-3">
            {recentInvoices.length === 0 ? (
              <p className="text-xs text-zinc-500 py-6 text-center">No se han emitido liquidaciones aún.</p>
            ) : (
              recentInvoices.map((invoice) => {
                const providerName = providers.find(c => c.id === invoice.cliente_id)?.nombre || 'Proveedor Desconocido';
                return (
                  <div key={invoice.id} className="flex justify-between items-center p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/80">
                    <div className="overflow-hidden pr-2">
                      <span className="text-xs font-semibold text-zinc-200 block truncate">{providerName}</span>
                      <span className="text-[10px] text-zinc-500 block mt-0.5">{invoice.numero_factura} • {new Date(invoice.fecha_emision).toLocaleDateString()}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-zinc-100 block">{formatCOP(Number(invoice.total))}</span>
                      <span className={`inline-block text-[9px] font-bold uppercase px-2 py-0.5 rounded-full mt-1 ${
                        invoice.estado === 'pagado'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {invoice.estado === 'pagado' ? 'Pagada' : 'Pendiente'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Columna: Proveedores Nuevos */}
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <Users size={16} className="text-purple-400" />
              Últimos Proveedores
            </h3>
            <Link href="/providers" className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">
              Ver todos <ArrowRight size={12} />
            </Link>
          </div>

          <div className="space-y-3">
            {recentProviders.length === 0 ? (
              <p className="text-xs text-zinc-500 py-6 text-center">No hay proveedores registrados.</p>
            ) : (
              recentProviders.map((provider) => (
                <Link 
                  key={provider.id}
                  href={`/billing?client=${provider.id}`}
                  className="flex justify-between items-center p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/80 hover:border-zinc-700/80 transition-all cursor-pointer group"
                >
                  <div className="overflow-hidden pr-2">
                    <span className="text-xs font-semibold text-zinc-200 group-hover:text-blue-400 transition-colors block truncate">
                      {provider.nombre}
                    </span>
                    <span className="text-[10px] text-zinc-500 block mt-0.5">{provider.telefono || 'Sin teléfono'}</span>
                  </div>
                  <div className="shrink-0 flex items-center text-zinc-500 group-hover:text-zinc-300 transition-colors">
                    <ArrowUpRight size={14} />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
