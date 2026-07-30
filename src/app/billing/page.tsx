'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import { jsPDF } from 'jspdf';
import { 
  Building2,
  Users, 
  Receipt, 
  Plus, 
  Printer, 
  Download, 
  Bluetooth,
  Trash2, 
  ArrowLeft, 
  ChevronRight,
  AlertCircle,
  Clock,
  CheckCircle2,
  Calendar,
  DollarSign,
  FileText,
  X,
  CreditCard,
  PlusCircle,
  History,
  Boxes,
  Pencil
} from 'lucide-react';

const formatCOP = (val: number, showSign = false) => {
  const formattedVal = Math.abs(val).toLocaleString('es-CO', { minimumFractionDigits: 0 });
  if (val < 0) {
    return `- $ ${formattedVal}`;
  }
  return showSign ? `+ $ ${formattedVal}` : `$ ${formattedVal}`;
};

// Formatea fechas evitando el corrimiento de zona horaria en strings tipo "yyyy-mm-dd"
const formatItemDate = (fechaStr?: string | null) => {
  if (!fechaStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) {
    const [y, m, d] = fechaStr.split('-');
    return `${d}/${m}/${y}`;
  }
  return new Date(fechaStr).toLocaleDateString('es-CO');
};

interface ImmediateItem {
  id: string;
  product_id: string | null;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  total: number;
  fecha: string;
  fromCatalog: boolean;
}

function BillingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = searchParams.get('client');

  const { 
    profile, 
    clients, 
    charges, 
    invoices, 
    products,
    fetchClients, 
    fetchCharges, 
    fetchInvoices, 
    fetchProducts,
    addCharge,
    deleteCharge,
    generateInvoice,
    deleteInvoice,
    updateInvoiceStatus,
    isLoading 
  } = useStore();

  const [activeTab, setActiveTab] = useState<'pending' | 'invoices' | 'history'>('pending');
  const [selectedClient, setSelectedClient] = useState<any>(null);
  
  // Modals state
  const [isChargeModalOpen, setIsChargeModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isLiquidationModalOpen, setIsLiquidationModalOpen] = useState(false);
  const [montoPagadoInput, setMontoPagadoInput] = useState('');
  const [activeInvoiceForPreview, setActiveInvoiceForPreview] = useState<any>(null);
  const [isPrintingBt, setIsPrintingBt] = useState(false);
  const [btError, setBtError] = useState<string | null>(null);

  // Form Movimiento state
  const [tipoMovimiento, setTipoMovimiento] = useState<'entrada' | 'salida'>('entrada');
  const [tipoUnidad, setTipoUnidad] = useState<'litro' | 'libra' | 'unidad' | 'muestra'>('litro');
  const [cantidad, setCantidad] = useState('');
  const [solicitadoPor, setSolicitadoPor] = useState('');
  const [comentario, setComentario] = useState('');
  const [monto, setMonto] = useState('');
  const [fechaMovimiento, setFechaMovimiento] = useState(new Date().toISOString().substring(0, 10));
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedProductPrice, setSelectedProductPrice] = useState(0);
  const [selectedProductName, setSelectedProductName] = useState('');

  // Estados de Compra Inmediata (Modo Directo)
  const [billingMode, setBillingMode] = useState<'acumulada' | 'inmediata'>('acumulada');
  const [immediateItems, setImmediateItems] = useState<ImmediateItem[]>([]);
  const [immediateDiscount, setImmediateDiscount] = useState('');
  const [immediateEstado, setImmediateEstado] = useState<'pendiente' | 'pagado'>('pendiente');
  const [immediateError, setImmediateError] = useState<string | null>(null);

  // Estados de Edición de Factura Emitida
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editInvoiceId, setEditInvoiceId] = useState<string | null>(null);
  const [editItems, setEditItems] = useState<ImmediateItem[]>([]);
  const [editEstado, setEditEstado] = useState<'pendiente' | 'pagado'>('pendiente');
  const [editOriginalChargeIds, setEditOriginalChargeIds] = useState<string[]>([]);
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Cargar datos iniciales
  useEffect(() => {
    fetchClients();
    fetchInvoices();
    fetchProducts();
  }, [fetchClients, fetchInvoices, fetchProducts]);

  // Redirigir a proveedores si no hay un cliente seleccionado en la URL
  useEffect(() => {
    if (!clientId) {
      router.replace('/providers');
    }
  }, [clientId, router]);

  // Si cambia el proveedor en URL, cargar sus cargos y liquidaciones
  useEffect(() => {
    if (clientId && clients.length > 0) {
      const client = clients.find(c => c.id === clientId);
      if (client) {
        setSelectedClient(client);
        fetchCharges(clientId);
      } else {
        setSelectedClient(null);
      }
    } else {
      setSelectedClient(null);
    }
  }, [clientId, clients, fetchCharges]);

  // Limpiar estados
  const openChargeModal = () => {
    setTipoMovimiento('entrada');
    setTipoUnidad('litro');
    setCantidad('');
    setSolicitadoPor('');
    setComentario('');
    setMonto('');
    setFechaMovimiento(new Date().toISOString().substring(0, 10));
    setFormError(null);
    setSelectedProductId('');
    setSelectedProductPrice(0);
    setSelectedProductName('');
    setIsChargeModalOpen(true);
  };

  const handleChargeProductSelect = (productId: string) => {
    setSelectedProductId(productId);
    const prod = products.find(p => p.id === productId);
    if (prod) {
      setSelectedProductPrice(Number(prod.precio));
      setSelectedProductName(prod.nombre);
    } else {
      setSelectedProductPrice(0);
      setSelectedProductName('');
    }
  };

  const getPriceForUnit = (unit: string) => {
    if (!profile) return 0;
    switch (unit) {
      case 'litro':
        return Number(profile.precio_litro || 0);
      case 'libra':
        return Number(profile.precio_libra || 0);
      case 'unidad':
        return Number(profile.precio_unidad || 0);
      case 'muestra':
      default:
        return 0;
    }
  };

  const handleAddMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    let finalDesc = '';
    let finalMonto = 0;

    if (tipoMovimiento === 'entrada') {
      if (!selectedProductId) {
        setFormError('Por favor selecciona un producto.');
        return;
      }
      const cantVal = parseFloat(cantidad);
      if (isNaN(cantVal) || cantVal <= 0) {
        setFormError('La cantidad entregada debe ser mayor a 0.');
        return;
      }
      finalMonto = cantVal * selectedProductPrice; // Positivo: El negocio le debe al proveedor
      finalDesc = `Entrega: ${cantVal} x ${selectedProductName}${comentario.trim() ? ` | ${comentario}` : ''}`;
    } else {
      const moneyVal = parseFloat(monto);
      if (isNaN(moneyVal) || moneyVal <= 0) {
        setFormError('El monto del adelanto debe ser mayor a 0.');
        return;
      }
      finalMonto = -moneyVal; // Negativo: Resta del saldo a favor del proveedor
      finalDesc = `Adelanto de efectivo${comentario.trim() ? ` | ${comentario}` : ''}`;
    }

    try {
      await addCharge({
        cliente_id: selectedClient.id,
        descripcion: finalDesc,
        monto: finalMonto,
        fecha: new Date(fechaMovimiento).toISOString(),
        tipo_movimiento: tipoMovimiento,
        tipo_unidad: null,
        cantidad: tipoMovimiento === 'entrada' ? parseFloat(cantidad) : null,
        precio_unitario: tipoMovimiento === 'entrada' ? selectedProductPrice : null,
        solicitado_por: tipoMovimiento === 'salida' && solicitadoPor.trim() ? solicitadoPor : null,
      });
      setIsChargeModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Error al agregar el movimiento.');
    }
  };

  const handleDeleteCharge = async (id: string) => {
    if (confirm('¿Deseas eliminar este movimiento del historial?')) {
      try {
        await deleteCharge(id, selectedClient.id);
      } catch (err: any) {
        alert(err.message || 'Error al eliminar el movimiento.');
      }
    }
  };

  // --- LÓGICA DE COMPRA DIRECTA (INMEDIATA) ---
  const addImmediateItem = () => {
    const newItem: ImmediateItem = {
      id: Math.random().toString(36).substring(2, 9),
      product_id: null,
      descripcion: '',
      cantidad: 0,
      precio_unitario: 0,
      total: 0,
      fecha: new Date().toISOString().substring(0, 10),
      fromCatalog: false,
    };
    setImmediateItems(prev => [...prev, newItem]);
  };

  const handleImmediateProductSelect = (id: string, productId: string) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) {
      setImmediateItems(prev => prev.map(item => {
        if (item.id === id) {
          return { ...item, product_id: null, fromCatalog: false };
        }
        return item;
      }));
      return;
    }

    setImmediateItems(prev => prev.map(item => {
      if (item.id === id) {
        const qty = item.cantidad || 0;
        return {
          ...item,
          product_id: prod.id,
          descripcion: prod.nombre,
          precio_unitario: Number(prod.precio),
          total: qty * Number(prod.precio),
          fromCatalog: true,
        };
      }
      return item;
    }));
  };

  const handleImmediateItemChange = (id: string, field: keyof ImmediateItem, value: any) => {
    setImmediateItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value } as ImmediateItem;
        if (field === 'cantidad' || field === 'precio_unitario') {
          updated.total = Number(updated.cantidad) * Number(updated.precio_unitario);
        }
        return updated;
      }
      return item;
    }));
  };

  const handleRemoveImmediateItem = (id: string) => {
    setImmediateItems(prev => prev.filter(item => item.id !== id));
  };

  // --- EDICIÓN DE FACTURA EMITIDA ---
  // Convierte una fecha (ISO o yyyy-mm-dd) al formato del input date (yyyy-mm-dd)
  const toDateInput = (fechaStr?: string | null) => {
    if (!fechaStr) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) return fechaStr;
    const d = new Date(fechaStr);
    if (isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const openEditInvoice = (invoice: any) => {
    // Obtener los conceptos: si la factura no trae items, derivarlos de los cargos vinculados
    const linkedCharges = invoice.charges && invoice.charges.length > 0
      ? invoice.charges
      : clientCharges.filter((c: any) => c.invoice_id === invoice.id);

    const srcItems = invoice.items && invoice.items.length > 0
      ? invoice.items
      : linkedCharges.map((c: any) => ({
          product_id: null,
          descripcion: c.solicitado_por ? `${c.descripcion} (Entregado a: ${c.solicitado_por})` : c.descripcion,
          fecha: c.fecha,
          cantidad: c.cantidad !== null && c.cantidad !== undefined ? Number(c.cantidad) : 1,
          precio_unitario: c.precio_unitario !== null && c.precio_unitario !== undefined ? Number(c.precio_unitario) : Number(c.monto),
          total: Number(c.monto),
        }));

    const mapped: ImmediateItem[] = srcItems.map((it: any) => ({
      id: Math.random().toString(36).substring(2, 9),
      product_id: it.product_id || null,
      descripcion: it.descripcion || '',
      cantidad: Number(it.cantidad) || 0,
      precio_unitario: Number(it.precio_unitario) || 0,
      total: Number(it.total) || 0,
      fecha: toDateInput(it.fecha),
      fromCatalog: false,
    }));

    setEditInvoiceId(invoice.id);
    setEditItems(mapped);
    setEditEstado(invoice.estado);
    setEditOriginalChargeIds(linkedCharges.map((c: any) => c.id));
    setEditError(null);
    setIsEditModalOpen(true);
  };

  const addEditItem = () => {
    setEditItems(prev => [...prev, {
      id: Math.random().toString(36).substring(2, 9),
      product_id: null,
      descripcion: '',
      cantidad: 0,
      precio_unitario: 0,
      total: 0,
      fecha: new Date().toISOString().substring(0, 10),
      fromCatalog: false,
    }]);
  };

  const handleEditProductSelect = (id: string, productId: string) => {
    const prod = products.find(p => p.id === productId);
    setEditItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      if (!prod) return { ...item, product_id: null, fromCatalog: false };
      const qty = item.cantidad || 0;
      return {
        ...item,
        product_id: prod.id,
        descripcion: prod.nombre,
        precio_unitario: Number(prod.precio),
        total: qty * Number(prod.precio),
        fromCatalog: true,
      };
    }));
  };

  const handleEditItemChange = (id: string, field: keyof ImmediateItem, value: any) => {
    setEditItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value } as ImmediateItem;
      if (field === 'cantidad' || field === 'precio_unitario') {
        updated.total = Number(updated.cantidad) * Number(updated.precio_unitario);
      }
      return updated;
    }));
  };

  const handleRemoveEditItem = (id: string) => {
    setEditItems(prev => prev.filter(item => item.id !== id));
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);

    if (editItems.length === 0) {
      setEditError('Debe haber al menos un concepto en la factura.');
      return;
    }
    for (const it of editItems) {
      if (!it.descripcion.trim()) {
        setEditError('Todos los conceptos deben tener una descripción.');
        return;
      }
      if (it.cantidad <= 0) {
        setEditError('La cantidad debe ser mayor a 0 en todos los conceptos.');
        return;
      }
      if (it.precio_unitario < 0) {
        setEditError('El precio unitario no puede ser negativo.');
        return;
      }
    }

    const subtotal = editItems.reduce((sum, item) => sum + item.total, 0);
    const total = subtotal;

    const itemsPayload = editItems.map(it => ({
      product_id: it.product_id,
      descripcion: it.descripcion,
      fecha: it.fecha || null,
      cantidad: it.cantidad,
      precio_unitario: it.precio_unitario,
      total: it.total,
    }));

    setIsSavingEdit(true);
    try {
      // 1. Eliminar la factura anterior (restaura inventario y desvincula sus movimientos)
      if (editInvoiceId) {
        await deleteInvoice(editInvoiceId);
      }

      // 2. Crear la corrección con número NUEVO, re-vinculando los movimientos originales
      const montoPagado = editEstado === 'pagado' ? total : 0;
      const deudaPendiente = editEstado === 'pagado' ? 0 : total;

      const newInvoice = await generateInvoice(
        selectedClient.id,
        itemsPayload,
        subtotal,
        total,
        editEstado,
        editOriginalChargeIds,
        montoPagado,
        deudaPendiente
      );

      // 3. Refrescar datos y mostrar la factura corregida
      await fetchInvoices();
      await fetchCharges(selectedClient.id);

      setIsEditModalOpen(false);
      setActiveInvoiceForPreview({ ...newInvoice, items: itemsPayload, charges: [] });
      setIsInvoiceModalOpen(true);
    } catch (err: any) {
      setEditError(err.message || 'Error al guardar los cambios.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const editSubtotal = editItems.reduce((sum, item) => sum + item.total, 0);

  const handleEmitImmediateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setImmediateError(null);

    if (immediateItems.length === 0) {
      setImmediateError('Debes agregar al menos un ítem a la compra.');
      return;
    }

    for (const it of immediateItems) {
      if (!it.descripcion.trim()) {
        setImmediateError('Todos los conceptos deben tener una descripción.');
        return;
      }
      if (it.cantidad <= 0) {
        setImmediateError('La cantidad debe ser mayor a 0 en todos los conceptos.');
        return;
      }
      if (it.precio_unitario < 0) {
        setImmediateError('El precio unitario no puede ser negativo.');
        return;
      }
    }

    const discountVal = parseFloat(immediateDiscount) || 0;
    if (discountVal < 0) {
      setImmediateError('El descuento no puede ser negativo.');
      return;
    }

    const subtotal = immediateItems.reduce((sum, item) => sum + item.total, 0);
    const total = subtotal - discountVal;

    const itemsPayload = immediateItems.map(it => ({
      product_id: null,
      descripcion: it.descripcion,
      fecha: it.fecha,
      cantidad: it.cantidad,
      precio_unitario: it.precio_unitario,
      total: it.total
    }));

    if (discountVal > 0) {
      itemsPayload.push({
        product_id: null,
        descripcion: 'Descuento aplicado',
        fecha: '',
        cantidad: 1,
        precio_unitario: -discountVal,
        total: -discountVal
      });
    }

    try {
      const newInvoice = await generateInvoice(
        selectedClient.id,
        itemsPayload,
        subtotal,
        total,
        immediateEstado,
        []
      );

      setActiveInvoiceForPreview({
        ...newInvoice,
        charges: [],
        items: itemsPayload
      });
      setIsInvoiceModalOpen(true);

      setImmediateItems([]);
      setImmediateDiscount('');
      setImmediateEstado('pendiente');
    } catch (err: any) {
      setImmediateError(err.message || 'Error al registrar la compra directa.');
    }
  };

  // --- LÓGICA DE LIQUIDACIÓN ACUMULATIVA ---
  const clientCharges = charges[selectedClient?.id] || [];
  const pendingCharges = clientCharges.filter(c => c.invoice_id === null);
  const currentBalance = pendingCharges.reduce((sum, c) => sum + Number(c.monto), 0);
  const clientInvoices = invoices.filter(i => i.cliente_id === selectedClient?.id);

  const previewItems = activeInvoiceForPreview?.items && activeInvoiceForPreview.items.length > 0
    ? activeInvoiceForPreview.items
    : (activeInvoiceForPreview?.charges && activeInvoiceForPreview.charges.length > 0
        ? activeInvoiceForPreview.charges
        : (activeInvoiceForPreview ? pendingCharges : [])
      ).map((c: any) => ({
        descripcion: c.descripcion,
        fecha: c.fecha || null,
        cantidad: c.cantidad !== null && c.cantidad !== undefined ? Number(c.cantidad) : 1,
        precio_unitario: c.precio_unitario !== null && c.precio_unitario !== undefined ? Number(c.precio_unitario) : Number(c.monto),
        total: Number(c.monto)
      }));

  const handleCreateInvoice = () => {
    if (pendingCharges.length === 0) {
      alert('No hay entregas pendientes de liquidar.');
      return;
    }
    // Si el proveedor debe dinero (saldo negativo), el negocio no le paga nada por defecto (0).
    // Si el negocio le debe al proveedor (saldo positivo), se sugiere pagar el total.
    setMontoPagadoInput(currentBalance < 0 ? '0' : String(Math.abs(currentBalance)));
    setIsLiquidationModalOpen(true);
  };

  const handleConfirmLiquidation = async (e: React.FormEvent) => {
    e.preventDefault();
    const paidAmount = parseFloat(montoPagadoInput) || 0;
    const balanceAbs = Math.abs(currentBalance);
    const debtAmount = Math.max(0, balanceAbs - paidAmount);

    const signedDebt = currentBalance < 0 ? -debtAmount : debtAmount;
    const subtotal = currentBalance;
    const total = currentBalance;

    const items = pendingCharges.map(c => {
      const baseDesc = c.solicitado_por ? `${c.descripcion} (Entregado a: ${c.solicitado_por})` : c.descripcion;
      return {
        product_id: null,
        descripcion: baseDesc,
        fecha: c.fecha,
        cantidad: c.cantidad !== null && c.cantidad !== undefined ? Number(c.cantidad) : 1,
        precio_unitario: c.precio_unitario !== null && c.precio_unitario !== undefined ? Number(c.precio_unitario) : Number(c.monto),
        total: Number(c.monto),
      };
    });

    try {
      const newInvoice = await generateInvoice(
        selectedClient.id,
        items,
        subtotal,
        total,
        debtAmount === 0 ? 'pagado' : 'pendiente',
        pendingCharges.map(c => c.id),
        paidAmount,
        debtAmount
      );

      // Si queda saldo pendiente (lo que el negocio no le pagó al proveedor), arrastrarlo al siguiente ciclo
      if (debtAmount > 0) {
        await addCharge({
          cliente_id: selectedClient.id,
          descripcion: `Saldo restante de factura anterior [${newInvoice.numero_factura}]`,
          monto: signedDebt,
          fecha: new Date().toISOString(),
          tipo_movimiento: signedDebt > 0 ? 'entrada' : 'salida',
          tipo_unidad: null,
          cantidad: null,
          precio_unitario: null,
          solicitado_por: null
        });
      }

      setActiveInvoiceForPreview({
        ...newInvoice,
        monto_pagado: paidAmount,
        deuda_pendiente: debtAmount,
        charges: pendingCharges
      });

      setIsLiquidationModalOpen(false);
      setIsInvoiceModalOpen(true);
    } catch (err: any) {
      alert(err.message || 'Error al liquidar la cuenta.');
    }
  };

  // --- EXPORTACIÓN E IMPRESIÓN ---
  const exportToPDF = (invoice: any) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter'
    });

    const client = clients.find(c => c.id === invoice.cliente_id) || selectedClient || { nombre: 'Proveedor Genérico', nit: 'C/F', telefono: '', direccion: '' };
    const items = invoice.items && invoice.items.length > 0 
      ? invoice.items 
      : (invoice.charges || clientCharges.filter((c: any) => c.invoice_id === invoice.id)).map((c: any) => ({
          descripcion: c.fecha ? `[${new Date(c.fecha).toLocaleDateString('es-CO')}] ${c.descripcion}` : c.descripcion,
          cantidad: 1,
          precio_unitario: Number(c.monto),
          total: Number(c.monto)
        }));

    const primaryColor = [15, 23, 42]; // Slate 900 (#0F172A)
    const accentColor = [37, 99, 235]; // Blue 600 (#2563EB)
    const textColor = [51, 65, 85]; // Slate 700 (#334155)
    const grayLight = [248, 250, 252]; // Slate 50 (#F8FAFC)
    const borderColor = [226, 232, 240]; // Slate 200 (#E2E8F0)

    const pageWidth = doc.internal.pageSize.getWidth();

    // --- BANDA SUPERIOR PREMIUM (HEADER A TODO EL ANCHO) ---
    const headerH = 44;
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, pageWidth, headerH, 'F');

    // Barra de acento en el borde superior
    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.rect(0, 0, pageWidth, 3, 'F');

    // Logo del negocio o monograma con su inicial
    if (profile?.logo_url) {
      try {
        const isPng = profile.logo_url.includes('image/png') || profile.logo_url.startsWith('data:image/png');
        doc.addImage(profile.logo_url, isPng ? 'PNG' : 'JPEG', 15, 10, 24, 24);
      } catch (err) {
        console.error("No se pudo añadir logo al PDF:", err);
      }
    } else {
      doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.roundedRect(15, 10, 24, 24, 3, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(16);
      const initial = (profile?.nombre_negocio || 'M').trim().charAt(0).toUpperCase();
      doc.text(initial, 27, 25.5, { align: 'center' });
    }

    // Nombre del Negocio
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(19);
    doc.text(profile?.nombre_negocio || 'Mi Negocio', 45, 21);

    // Subtítulo de marca
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('COMPROBANTE DE LIQUIDACIÓN COMERCIAL', 45, 27);

    // Datos de contacto, alineados a la derecha dentro de la banda
    doc.setTextColor(203, 213, 225); // Slate 300
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`NIT: ${profile?.nit || 'CF'}`, 195, 15, { align: 'right' });
    doc.text(`Tel: ${profile?.telefono || 'N/A'}`, 195, 20.5, { align: 'right' });
    const dirLines = doc.splitTextToSize(`Dirección: ${profile?.direccion || 'N/A'}`, 75);
    dirLines.slice(0, 2).forEach((line: string, i: number) => {
      doc.text(line, 195, 26 + i * 4, { align: 'right' });
    });

    // Caja para Datos del Proveedor (Estilo premium con bordes redondeados y relleno suave)
    doc.setFillColor(252, 253, 254);
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setLineWidth(0.3);
    doc.roundedRect(15, 52, 98, 28, 2, 2, 'FD');
    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.roundedRect(15, 52, 1.4, 28, 0.7, 0.7, 'F');

    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('PAGAR A (PROVEEDOR):', 20, 58);
    
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(client.nombre || 'Proveedor Genérico', 20, 64);
    
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFontSize(9);
    doc.text(`Teléfono: ${client.telefono || 'N/A'}`, 20, 69);
    doc.text(`Dirección: ${client.direccion || 'N/A'}`, 20, 74);

    // Caja Detalles Factura
    doc.setFillColor(252, 253, 254);
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setLineWidth(0.3);
    doc.roundedRect(122, 52, 73, 28, 2, 2, 'FD');
    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.roundedRect(122, 52, 1.4, 28, 0.7, 0.7, 'F');

    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text('LIQUIDACIÓN DE COMPRA', 127, 58);
    
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFontSize(9.5);
    doc.text(`Liquidación N°: ${invoice.numero_factura}`, 127, 64);
    
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`Fecha Emisión: ${new Date(invoice.fecha_emision).toLocaleDateString('es-CO')}`, 127, 69);
    
    const isPaid = invoice.estado === 'pagado';
    doc.setTextColor(isPaid ? 16 : 217, isPaid ? 124 : 119, isPaid ? 65 : 6);
    doc.setFont('Helvetica', 'bold');
    doc.text(`Estado: ${isPaid ? 'LIQUIDADA' : 'PENDIENTE'}`, 127, 74);

    // Sello diagonal tipo "rubber stamp"
    doc.saveGraphicsState();
    doc.setFontSize(30);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(isPaid ? 16 : 239, isPaid ? 185 : 68, isPaid ? 129 : 68);
    const stampAlpha = 0.12;
    doc.setGState(doc.GState({ opacity: stampAlpha }));
    const stampText = isPaid ? 'LIQUIDADO' : 'PENDIENTE';
    doc.text(stampText, 105, 145, { angle: 35, align: 'center' });
    doc.restoreGraphicsState();

    // Tabla de Conceptos
    let y = 92;
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.roundedRect(15, y - 5, 180, 8, 1, 1, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('Fecha', 18, y);
    doc.text('Concepto / Movimiento', 40, y);
    doc.text('Cant.', 125, y, { align: 'right' });
    doc.text('Precio U.', 155, y, { align: 'right' });
    doc.text('Total', 190, y, { align: 'right' });

    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    y += 8;

    items.forEach((it: any, index: number) => {
      const descLines = doc.splitTextToSize(it.descripcion, 80);
      const rowHeight = Math.max(7.5, descLines.length * 4 + 2);

      if (index % 2 === 0) {
        doc.setFillColor(grayLight[0], grayLight[1], grayLight[2]);
        doc.rect(15, y - 4, 180, rowHeight, 'F');
      }

      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.setLineWidth(0.2);
      doc.line(15, y + rowHeight - 4, 195, y + rowHeight - 4);

      doc.text(formatItemDate(it.fecha) || '-', 18, y);
      descLines.forEach((line: string, lineIndex: number) => {
        doc.text(line, 40, y + (lineIndex * 4));
      });

      doc.text(String(it.cantidad), 125, y, { align: 'right' });
      doc.text(formatCOP(it.precio_unitario), 155, y, { align: 'right' });
      doc.text(formatCOP(it.total), 190, y, { align: 'right' });

      y += rowHeight;

      if (y > 230) {
        doc.addPage();
        y = 25;
        // Barra de acento superior en páginas siguientes
        doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.rect(0, 0, pageWidth, 2.5, 'F');

        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.roundedRect(15, y - 5, 180, 8, 1, 1, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('Helvetica', 'bold');
        doc.text('Fecha', 18, y);
        doc.text('Concepto / Movimiento', 40, y);
        doc.text('Cant.', 125, y, { align: 'right' });
        doc.text('Precio U.', 155, y, { align: 'right' });
        doc.text('Total', 190, y, { align: 'right' });
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        doc.setFont('Helvetica', 'normal');
        y += 8;
      }
    });

    // Totales
    y += 4;
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(0.5);
    doc.line(125, y, 195, y);
    y += 6;

    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('TOTAL ACUMULADO:', 130, y);
    doc.setFont('Helvetica', 'normal');
    doc.text(formatCOP(invoice.subtotal), 190, y, { align: 'right' });

    const hasDebt = invoice.deuda_pendiente !== undefined && Number(invoice.deuda_pendiente) > 0;
    if (hasDebt) {
      y += 7;
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.setFont('Helvetica', 'bold');
      doc.text('MONTO PAGADO:', 130, y);
      doc.setFont('Helvetica', 'normal');
      doc.text(formatCOP(invoice.monto_pagado || 0), 190, y, { align: 'right' });

      y += 7;
      doc.setFillColor(239, 68, 68);
      doc.roundedRect(125, y - 5, 70, 8, 1.5, 1.5, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('SALDO PENDIENTE:', 130, y);
      doc.text(formatCOP(invoice.deuda_pendiente || 0), 190, y, { align: 'right' });
    } else {
      y += 7;
      doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.roundedRect(125, y - 5, 70, 8, 1.5, 1.5, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.text('TOTAL NETO A PAGAR:', 130, y);
      doc.text(formatCOP(invoice.total), 190, y, { align: 'right' });
    }

    // --- GENERAR CORRIDA DE FOOTERS EN CADA PÁGINA (BRANDING DE SPINKIU) ---
    const pageHeight = doc.internal.pageSize.getHeight();
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);

      const bandH = 16;
      const bandY = pageHeight - bandH;

      // Banda inferior azul oscuro (combina con el encabezado)
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, bandY, pageWidth, bandH, 'F');
      // Barra de acento en el borde superior de la banda
      doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.rect(0, bandY, pageWidth, 1.2, 'F');

      // Marca "Spinkiu" resaltada en azul
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(96, 165, 250); // blue-400, resalta sobre el fondo oscuro
      doc.text('Spinkiu', 15, bandY + 8);

      // Tagline debajo de la marca
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text('Sistema de gestión y facturación', 15, bandY + 12);

      // Contacto a la derecha
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      doc.text('Tel: 313 568 9366', pageWidth - 15, bandY + 8, { align: 'right' });

      // Numeración de páginas
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(`Página ${i} de ${totalPages}`, pageWidth - 15, bandY + 12, { align: 'right' });
    }

    const nameSafe = client.nombre.replace(/\s+/g, '_');
    doc.save(`${invoice.numero_factura}_${nameSafe}.pdf`);
  };

  const printThermalTicket = (invoice: any) => {
    setActiveInvoiceForPreview(invoice);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  const printBluetoothESCPOSTicket = async (invoice: any) => {
    if (typeof navigator === 'undefined' || !(navigator as any).bluetooth) {
      alert('Tu navegador o dispositivo no soporta Web Bluetooth. Usa Chrome o Edge en Android/PC.');
      return;
    }

    setIsPrintingBt(true);
    setBtError(null);

    try {
      // 1. Request Bluetooth Device (Accept all to allow generic cheap thermal printers)
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb', '00001101-0000-1000-8000-00805f9b34fb']
      });

      if (!device) {
        throw new Error('Dispositivo no seleccionado.');
      }

      const server = await device.gatt?.connect();
      if (!server) {
        throw new Error('No se pudo conectar al servidor GATT de la impresora.');
      }

      // Buscar Servicio de Impresión
      let service;
      try {
        service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
      } catch (e) {
        try {
          service = await server.getPrimaryService('00001101-0000-1000-8000-00805f9b34fb');
        } catch (e2) {
          // Intentar obtener todos los servicios primarios no es posible sin UUIDs, lanzar error
          throw new Error('No se encontró un servicio de impresión estándar (0x18F0 o 0x1101) en esta impresora.');
        }
      }

      // Buscar Característica de Escritura
      let characteristic;
      try {
        characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');
      } catch (e) {
        try {
          characteristic = await service.getCharacteristic('00001101-0000-1000-8000-00805f9b34fb');
        } catch (e2) {
          const characteristics = await service.getCharacteristics();
          const writeChar = characteristics.find((c: any) => c.properties.write || c.properties.writeWithoutResponse);
          if (writeChar) {
            characteristic = writeChar;
          } else {
            throw new Error('No se encontró una característica de escritura disponible en el servicio.');
          }
        }
      }

      // 2. Formatear datos del ticket en comandos ESC/POS
      const client = clients.find(c => c.id === invoice.cliente_id) || selectedClient || { nombre: 'Proveedor Genérico' };
      
      const items = invoice.items && invoice.items.length > 0 
        ? invoice.items 
        : (invoice.charges || []).map((c: any) => ({
            descripcion: c.descripcion,
            cantidad: c.cantidad !== null && c.cantidad !== undefined ? Number(c.cantidad) : 1,
            precio_unitario: c.precio_unitario !== null && c.precio_unitario !== undefined ? Number(c.precio_unitario) : Number(c.monto),
            total: Number(c.monto)
          }));

      // Comandos binarios ESC/POS estándar
      const init = '\x1b\x40';
      const center = '\x1b\x61\x01';
      const left = '\x1b\x61\x00';
      const boldOn = '\x1b\x45\x01';
      const boldOff = '\x1b\x45\x00';
      const doubleSize = '\x1d\x21\x11';
      const normalSize = '\x1d\x21\x00';
      const cut = '\x1d\x56\x01';
      const lineBreak = '\n';

      const formatLine = (l: string, r: string, width = 32) => {
        const spaceNeeded = width - l.length - r.length;
        if (spaceNeeded > 0) return l + ' '.repeat(spaceNeeded) + r;
        return l.slice(0, width - r.length - 1) + ' ' + r;
      };

      let ticket = '';
      ticket += init;
      
      // Nombre de negocio
      ticket += center + doubleSize + boldOn + (profile?.nombre_negocio || 'Mi Negocio') + lineBreak + normalSize + boldOff;
      if (profile?.nit) ticket += `NIT: ${profile.nit}` + lineBreak;
      if (profile?.telefono) ticket += `Tel: ${profile.telefono}` + lineBreak;
      if (profile?.direccion) ticket += `Dir: ${profile.direccion.slice(0, 32)}` + lineBreak;
      ticket += '-'.repeat(32) + lineBreak;

      // Encabezado Factura
      ticket += center + boldOn + `LIQUIDACION: ${invoice.numero_factura}` + lineBreak + boldOff;
      ticket += left + `Fecha: ${new Date(invoice.fecha_emision).toLocaleDateString()}` + lineBreak;
      ticket += `Proveedor: ${client.nombre.slice(0, 20)}` + lineBreak;
      const isPaid = invoice.estado === 'pagado';
      ticket += `Estado: ${isPaid ? 'LIQUIDADA' : 'PENDIENTE'}` + lineBreak;
      ticket += '-'.repeat(32) + lineBreak;

      // Tabla de Conceptos
      ticket += boldOn + formatLine('Concepto', 'Total') + boldOff + lineBreak;
      ticket += '-'.repeat(32) + lineBreak;

      items.forEach((it: any) => {
        const desc = it.descripcion;
        const totalStr = formatCOP(Number(it.total));
        if (it.fecha) {
          ticket += formatItemDate(it.fecha) + lineBreak;
        }
        if (desc.length > 20) {
          ticket += desc + lineBreak;
          ticket += formatLine(`  ${it.cantidad} x ${formatCOP(Number(it.precio_unitario))}`, totalStr) + lineBreak;
        } else {
          ticket += formatLine(`${desc} x${it.cantidad}`, totalStr) + lineBreak;
        }
      });
      ticket += '-'.repeat(32) + lineBreak;

      // Totales
      ticket += formatLine('TOTAL ACUMULADO:', formatCOP(Number(invoice.subtotal))) + lineBreak;
      if (invoice.deuda_pendiente !== undefined && Number(invoice.deuda_pendiente) > 0) {
        ticket += formatLine('MONTO PAGADO:', formatCOP(Number(invoice.monto_pagado || 0))) + lineBreak;
        ticket += boldOn + formatLine('SALDO PENDIENTE:', formatCOP(Number(invoice.deuda_pendiente))) + boldOff + lineBreak;
      } else {
        ticket += boldOn + formatLine('TOTAL NETO:', formatCOP(Number(invoice.total))) + boldOff + lineBreak;
      }
      
      ticket += lineBreak + center + 'Gracias por su entrega!' + lineBreak + lineBreak + lineBreak + lineBreak + cut;

      // 3. Codificar y enviar en ráfagas (chunks) de 20 bytes para evitar buffer overflows
      const encoder = new TextEncoder();
      const bytes = encoder.encode(ticket);
      const chunkSize = 20;
      
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.slice(i, i + chunkSize);
        await characteristic.writeValue(chunk);
        // Delay corto entre transmisiones BLE
        await new Promise(r => setTimeout(r, 40));
      }

      alert('¡Impresión Bluetooth enviada con éxito!');
    } catch (err: any) {
      console.error('Error al imprimir por Bluetooth:', err);
      setBtError(err.message || 'Error de conexión o de impresión.');
      alert(`Error al imprimir por Bluetooth: ${err.message || 'Desconocido'}`);
    } finally {
      setIsPrintingBt(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex-1 flex flex-col h-full no-print">
      {!selectedClient ? (
        <div className="flex-1 p-4 md:p-8 max-w-lg mx-auto w-full flex flex-col justify-center space-y-6">
          <div className="text-center space-y-2">
            <div className="h-12 w-12 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center mx-auto">
              <Users size={24} />
            </div>
            <h1 className="text-2xl font-extrabold text-zinc-100 tracking-tight">Cuentas Corrientes</h1>
            <p className="text-sm text-zinc-400">Selecciona un proveedor para gestionar sus entregas de producto y adelantos de dinero.</p>
          </div>

          <button
            onClick={() => router.push('/billing/manual')}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600/10 to-indigo-600/10 border border-blue-500/30 hover:border-blue-500/50 text-blue-400 font-bold text-sm transition-all cursor-pointer shadow-lg shadow-blue-500/5 flex items-center justify-center gap-2 group"
          >
            <FileText size={16} className="group-hover:scale-110 transition-transform" />
            Crear Compra Directa (Manual)
          </button>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3 shadow-lg shadow-black/20">
            <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Listado de Proveedores</h2>
            {clients.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-xs text-zinc-500">No hay proveedores registrados.</p>
                <button
                  onClick={() => router.push('/providers?action=new')}
                  className="mt-3 text-xs font-bold text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 cursor-pointer"
                >
                  Registrar mi primer proveedor <ChevronRight size={14} />
                </button>
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto divide-y divide-zinc-800/60 pr-1">
                {clients.map(c => (
                  <button
                    key={c.id}
                    onClick={() => router.push(`/billing?client=${c.id}`)}
                    className="w-full flex items-center justify-between py-3 text-left hover:bg-zinc-800/30 px-2 rounded-xl transition-all cursor-pointer group"
                  >
                    <div>
                      <span className="text-sm font-semibold text-zinc-200 group-hover:text-blue-400 transition-colors block">{c.nombre}</span>
                      <span className="text-[10px] text-zinc-500 block mt-0.5">{c.telefono || 'Sin teléfono'}</span>
                    </div>
                    <ChevronRight size={16} className="text-zinc-650 group-hover:text-zinc-400 transition-colors" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full flex flex-col space-y-6">
          {/* Cabecera del Proveedor */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800 pb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/billing')}
                className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer shrink-0"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <span className="text-xs font-bold text-blue-500 uppercase tracking-widest">Cuenta Corriente</span>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-100 mt-0.5">{selectedClient.nombre}</h1>
              </div>
            </div>

            {/* Saldo y Botón Crear Movimiento */}
            {billingMode === 'acumulada' && (
              <div className="flex items-center gap-3 self-end sm:self-auto">
                <div className="text-right">
                  <span className="text-[10px] text-zinc-500 font-semibold block uppercase">
                    {currentBalance >= 0 ? 'Saldo por Pagar al Proveedor' : 'Saldo a Favor del Negocio'}
                  </span>
                  <span className={`text-lg md:text-xl font-bold block tracking-tight ${
                    currentBalance > 0 
                      ? 'text-emerald-400' 
                      : currentBalance < 0 
                        ? 'text-red-400' 
                        : 'text-zinc-400'
                  }`}>
                    {formatCOP(currentBalance, true)}
                  </span>
                </div>

                <button
                  onClick={openChargeModal}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all cursor-pointer shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20"
                >
                  <Plus size={16} />
                  Nuevo Movimiento
                </button>
              </div>
            )}
          </div>

          {/* Toggle de Modo: Cuenta Acumulada vs Compra Directa */}
          <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800/60 self-start">
            <button
              onClick={() => setBillingMode('acumulada')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                billingMode === 'acumulada'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Cuenta Acumulada
            </button>
            <button
              onClick={() => setBillingMode('inmediata')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                billingMode === 'inmediata'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Compra Directa
            </button>
          </div>

          {/* Alerta de Saldo Pendiente en Rojo (Notable si es negativo) */}
          {billingMode === 'acumulada' && currentBalance < 0 && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm font-semibold flex items-center gap-2.5 shadow-lg shadow-red-950/10">
              <AlertCircle className="shrink-0 animate-bounce text-red-400" size={20} />
              <div>
                <span className="font-extrabold uppercase text-xs tracking-wider block text-red-300">¡Saldo Deudor Detectado!</span>
                <p className="text-xs text-red-400/90 mt-0.5">El proveedor queda debiendo <span className="font-extrabold text-red-100">{formatCOP(Math.abs(currentBalance))}</span> al negocio por excedente de adelantos.</p>
              </div>
            </div>
          )}

          {billingMode === 'acumulada' ? (
            <>
              {/* Menú de Pestañas */}
              <div className="flex gap-2 border-b border-zinc-900">
                <button
                  onClick={() => setActiveTab('pending')}
                  className={`pb-3 text-xs font-bold tracking-wider uppercase border-b-2 px-1 transition-all cursor-pointer ${
                    activeTab === 'pending'
                      ? 'border-blue-500 text-zinc-100'
                      : 'border-transparent text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Periodo Activo ({pendingCharges.length})
                </button>
                <button
                  onClick={() => setActiveTab('invoices')}
                  className={`pb-3 text-xs font-bold tracking-wider uppercase border-b-2 px-1 transition-all cursor-pointer ${
                    activeTab === 'invoices'
                      ? 'border-blue-500 text-zinc-100'
                      : 'border-transparent text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Liquidaciones Emitidas ({clientInvoices.length})
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`pb-3 text-xs font-bold tracking-wider uppercase border-b-2 px-1 transition-all cursor-pointer ${
                    activeTab === 'history'
                      ? 'border-blue-500 text-zinc-100'
                      : 'border-transparent text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Historial de Movimientos ({clientCharges.length})
                </button>
              </div>

              {/* Renderizado de las pestañas */}
              <div className="flex-1 overflow-y-auto">
                {/* Pestaña: Periodo Activo */}
                {activeTab === 'pending' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4">
                      <div className="space-y-1 pr-4">
                        <span className="text-xs text-zinc-400 font-medium block">Resumen del periodo de acopio activo</span>
                        <p className="text-[11px] text-zinc-500 leading-normal">
                          Al presionar &quot;Liquidar Cuenta&quot;, todas las entregas y adelantos se agruparán en una liquidación de compra y el periodo activo se cerrará.
                        </p>
                      </div>
                      {pendingCharges.length > 0 && (
                        <button
                          onClick={handleCreateInvoice}
                          className="shrink-0 flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs tracking-wide uppercase transition-all cursor-pointer shadow-lg shadow-emerald-600/10 hover:shadow-emerald-500/20"
                        >
                          <Receipt size={14} />
                          Liquidar Cuenta
                        </button>
                      )}
                    </div>

                    {pendingCharges.length === 0 ? (
                      <div className="text-center py-12 bg-zinc-900/10 border border-zinc-800/30 rounded-2xl">
                        <CheckCircle2 className="mx-auto text-zinc-700 mb-3" size={32} />
                        <p className="text-sm text-zinc-400 font-semibold">Al día. Sin movimientos registrados</p>
                        <p className="text-xs text-zinc-500 mt-1">Registra una entrega de producto o adelanto de dinero.</p>
                      </div>
                    ) : (
                      <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl divide-y divide-zinc-800/80 overflow-hidden shadow-inner">
                        {pendingCharges.map((charge) => (
                          <div 
                            key={charge.id} 
                            className="flex justify-between items-center p-4 hover:bg-zinc-800/10 transition-all"
                          >
                            <div className="space-y-0.5">
                              <span className="text-sm font-semibold text-zinc-200 block">{charge.descripcion}</span>
                              <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                                <Calendar size={10} />
                                <span>{new Date(charge.fecha).toLocaleDateString()}</span>
                                <span className="inline-block px-1.5 py-0.5 rounded-full bg-zinc-800 font-semibold text-[9px]">Pendiente de liquidar</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className={`text-sm font-bold ${charge.monto > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {formatCOP(Number(charge.monto), true)}
                              </span>
                              <button
                                onClick={() => handleDeleteCharge(charge.id)}
                                className="p-1.5 rounded-lg bg-zinc-850 hover:bg-red-950/30 text-zinc-500 hover:text-red-400 transition-all cursor-pointer"
                                title="Eliminar Movimiento"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Pestaña: Liquidaciones Emitidas */}
                {activeTab === 'invoices' && (
                  <div className="space-y-3">
                    {clientInvoices.length === 0 ? (
                      <div className="text-center py-12 bg-zinc-900/10 border border-zinc-800/30 rounded-2xl">
                        <Receipt className="mx-auto text-zinc-700 mb-3" size={32} />
                        <p className="text-sm text-zinc-400 font-semibold">No se han emitido liquidaciones aún</p>
                        <p className="text-xs text-zinc-500 mt-1">Cuando liquides el periodo del proveedor, aparecerán aquí.</p>
                      </div>
                    ) : (
                      clientInvoices.map((invoice) => (
                        <div 
                          key={invoice.id} 
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/60 gap-4"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-zinc-200">{invoice.numero_factura}</span>
                              <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                                invoice.estado === 'pagado'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              }`}>
                                {invoice.estado === 'pagado' ? 'Liquidada' : 'Saldo Pendiente'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                              <Calendar size={10} />
                              <span>{new Date(invoice.fecha_emision).toLocaleDateString()}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-6 border-t border-zinc-900 sm:border-0 pt-2 sm:pt-0">
                            <div className="text-left sm:text-right">
                              <span className="text-[9px] text-zinc-500 font-semibold block uppercase">Total Compra</span>
                              <span className="text-sm font-bold text-zinc-100">{formatCOP(Number(invoice.total))}</span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {invoice.estado === 'pendiente' && (
                                <button
                                  onClick={() => {
                                    if (confirm('¿Marcar esta liquidación como PAGADA/LIQUIDADA por completo?')) {
                                      updateInvoiceStatus(invoice.id, 'pagado');
                                    }
                                  }}
                                  className="px-2.5 py-1.5 bg-zinc-800 hover:bg-emerald-950/20 border border-zinc-800 hover:border-emerald-900/30 text-xs font-semibold text-emerald-400 rounded-lg transition-all cursor-pointer"
                                >
                                  Marcar Pagada
                                </button>
                              )}
                              <button
                                onClick={() => openEditInvoice(invoice)}
                                className="p-2 rounded-lg bg-zinc-850 hover:bg-blue-950/30 text-zinc-400 hover:text-blue-400 transition-all cursor-pointer"
                                title="Editar / Corregir Liquidación"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                onClick={() => printThermalTicket(invoice)}
                                className="p-2 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
                                title="Imprimir Ticket"
                              >
                                <Printer size={13} />
                              </button>
                              <button
                                onClick={() => exportToPDF(invoice)}
                                className="p-2 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
                                title="Descargar PDF"
                              >
                                <Download size={13} />
                              </button>
                              <button
                                onClick={async () => {
                                  if (confirm('¿Anular esta liquidación? Los movimientos volverán al periodo activo.')) {
                                    try {
                                      await deleteInvoice(invoice.id);
                                    } catch (err: any) {
                                      alert(err.message || 'Error al anular liquidación.');
                                    }
                                  }
                                }}
                                className="p-2 rounded-lg bg-zinc-850 hover:bg-red-950/30 text-zinc-500 hover:text-red-400 transition-all cursor-pointer"
                                title="Anular Liquidación"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Pestaña: Historial Completo */}
                {activeTab === 'history' && (
                  <div className="space-y-2">
                    {clientCharges.length === 0 ? (
                      <div className="text-center py-12 bg-zinc-900/10 border border-zinc-800/30 rounded-2xl">
                        <History className="mx-auto text-zinc-700 mb-3" size={32} />
                        <p className="text-sm text-zinc-400 font-semibold">Sin movimientos registrados</p>
                        <p className="text-xs text-zinc-500 mt-1">Los movimientos de la cuenta corriente aparecerán aquí.</p>
                      </div>
                    ) : (
                      <div className="bg-zinc-900/20 border border-zinc-900/80 rounded-2xl divide-y divide-zinc-800/60 overflow-hidden shadow-inner">
                        {clientCharges.map((charge) => {
                          const linkedInvoice = invoices.find(i => i.id === charge.invoice_id);
                          return (
                            <div 
                              key={charge.id} 
                              className="flex justify-between items-center p-3.5 hover:bg-zinc-800/10 transition-all"
                            >
                              <div>
                                <span className="text-sm font-semibold text-zinc-300 block">{charge.descripcion}</span>
                                <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-0.5">
                                  <Calendar size={10} />
                                  <span>{new Date(charge.fecha).toLocaleDateString()}</span>
                                  <span>•</span>
                                  {linkedInvoice ? (
                                    <span className="text-blue-400 font-medium">Liquidado en {linkedInvoice.numero_factura}</span>
                                  ) : (
                                    <span className="text-amber-500 font-medium text-[9px]">Pendiente de liquidar</span>
                                  )}
                                </div>
                              </div>
                              <span className={`text-sm font-bold ${charge.monto > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {formatCOP(Number(charge.monto), true)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto pr-1">
              <form onSubmit={handleEmitImmediateInvoice} className="space-y-6">
                {immediateError && (
                  <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                    <AlertCircle size={18} />
                    <span>{immediateError}</span>
                  </div>
                )}

                {/* Cabecera de conceptos */}
                <div className="flex justify-between items-center">
                  <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Conceptos de Compra</h2>
                  <button
                    type="button"
                    onClick={addImmediateItem}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-xs font-bold text-blue-400 rounded-lg cursor-pointer transition-all"
                  >
                    <Plus size={14} />
                    Añadir Línea
                  </button>
                </div>

                {/* Listado de ítems de la compra inmediata */}
                <div className="space-y-3">
                  {immediateItems.length === 0 ? (
                    <div className="text-center py-10 bg-zinc-900/10 border border-zinc-800/30 rounded-2xl p-6">
                      <Boxes className="mx-auto text-zinc-650 mb-3" size={28} />
                      <p className="text-xs text-zinc-400 font-semibold">Sin conceptos agregados</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Presiona &quot;Añadir Línea&quot; para ingresar conceptos o productos.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {immediateItems.map((item) => (
                        <div 
                          key={item.id}
                          className="flex flex-col gap-3 p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/60 relative"
                        >
                          {/* Row 1: Producto + Descripción + Fecha */}
                          <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1">
                              <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Producto</label>
                              <select
                                value={item.product_id || ''}
                                onChange={(e) => handleImmediateProductSelect(item.id, e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 text-xs text-zinc-300 focus:outline-none"
                              >
                                <option value="">-- Seleccionar del Catálogo --</option>
                                {products.map(p => (
                                  <option key={p.id} value={p.id}>{p.nombre} ({formatCOP(p.precio)})</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex-1">
                              <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Descripción</label>
                              <input
                                type="text"
                                placeholder="Detalle o nota del concepto..."
                                value={item.descripcion}
                                onChange={(e) => handleImmediateItemChange(item.id, 'descripcion', e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 text-xs text-zinc-100 focus:outline-none"
                                required
                              />
                            </div>
                            <div className="w-full sm:w-36">
                              <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Fecha</label>
                              <input
                                type="date"
                                value={item.fecha}
                                onChange={(e) => handleImmediateItemChange(item.id, 'fecha', e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 text-xs text-zinc-100 focus:outline-none"
                              />
                            </div>
                          </div>

                          {/* Row 2: Cantidad + Precio + Total + Remover */}
                          <div className="flex gap-3 items-end">
                            <div className="w-20">
                              <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Cantidad</label>
                              <input
                                type="number"
                                min="0"
                                step="any"
                                placeholder="0"
                                value={item.cantidad || ''}
                                onChange={(e) => handleImmediateItemChange(item.id, 'cantidad', parseFloat(e.target.value) || 0)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-2 text-center text-xs text-zinc-100 focus:outline-none"
                                required
                              />
                            </div>

                            <div className="w-28">
                              <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                                Precio Unit. {item.fromCatalog && <span className="text-blue-400 normal-case">(catálogo)</span>}
                              </label>
                              <input
                                type="number"
                                step="any"
                                placeholder="$ 0"
                                value={item.precio_unitario || ''}
                                onChange={(e) => handleImmediateItemChange(item.id, 'precio_unitario', parseFloat(e.target.value) || 0)}
                                readOnly={item.fromCatalog}
                                className={`w-full border rounded-lg py-2 px-3 text-right text-xs focus:outline-none ${
                                  item.fromCatalog
                                    ? 'bg-zinc-900 border-zinc-700 text-blue-300 cursor-not-allowed'
                                    : 'bg-zinc-950 border-zinc-800 text-zinc-100'
                                }`}
                                required
                              />
                            </div>

                            <div className="w-24 text-right">
                              <span className="block text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Total</span>
                              <span className="text-xs font-bold text-zinc-200">{formatCOP(item.total)}</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveImmediateItem(item.id)}
                              className="p-2 rounded-lg bg-zinc-850 hover:bg-red-950/20 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer mb-0.5"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Descuentos y Estado de Pago */}
                {immediateItems.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-zinc-900/40 border border-zinc-800/80 p-4 rounded-xl">
                    <div>
                      <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Descuento ($ COP)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={immediateDiscount}
                        onChange={(e) => setImmediateDiscount(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Estado del Pago</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setImmediateEstado('pendiente')}
                          className={`py-3 rounded-xl font-bold text-xs tracking-wider uppercase border transition-all cursor-pointer ${
                            immediateEstado === 'pendiente'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                          }`}
                        >
                          Saldo Pendiente
                        </button>
                        <button
                          type="button"
                          onClick={() => setImmediateEstado('pagado')}
                          className={`py-3 rounded-xl font-bold text-xs tracking-wider uppercase border transition-all cursor-pointer ${
                            immediateEstado === 'pagado'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                          }`}
                        >
                          Pagado / Liquidado
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Totales y Emisión */}
                {immediateItems.length > 0 && (
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-900/40 border border-zinc-800/80 p-5 rounded-2xl">
                    <div className="text-left space-y-1">
                      <span className="text-[10px] text-zinc-500 font-semibold uppercase block">Resumen de Totales</span>
                      <div className="flex gap-4 text-xs text-zinc-400">
                        <span>Subtotal: {formatCOP(immediateItems.reduce((sum, item) => sum + item.total, 0))}</span>
                        {parseFloat(immediateDiscount) > 0 && (
                          <span className="text-red-400">Desc: - {formatCOP(parseFloat(immediateDiscount))}</span>
                        )}
                      </div>
                      <span className="text-xl font-black text-blue-400 tracking-tight block pt-1">
                        Total: {formatCOP(immediateItems.reduce((sum, item) => sum + item.total, 0) - (parseFloat(immediateDiscount) || 0))}
                      </span>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold px-6 py-3.5 rounded-xl text-sm transition-all cursor-pointer shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 flex items-center justify-center gap-2"
                    >
                      <FileText size={18} />
                      Registrar e Imprimir Compra
                    </button>
                  </div>
                )}
              </form>
            </div>
          )}
        </div>
      )}

      {/* MODAL: REGISTRAR MOVIMIENTO (ENTREGA / ADELANTO) */}
      <AnimatePresence>
        {isChargeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsChargeModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-full md:max-w-md bg-zinc-900 border-t md:border border-zinc-800 rounded-t-3xl md:rounded-2xl p-6 shadow-2xl z-10 overflow-hidden"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-zinc-100">Registrar Entrega / Adelanto</h2>
                <button
                  onClick={() => setIsChargeModalOpen(false)}
                  className="p-1 rounded-full bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {formError && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleAddMovement} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Tipo de Movimiento</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTipoMovimiento('entrada')}
                      className={`py-3 rounded-xl font-bold text-xs tracking-wider uppercase border transition-all cursor-pointer ${
                        tipoMovimiento === 'entrada'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                      }`}
                    >
                      Entrega de Producto
                    </button>
                    <button
                      type="button"
                      onClick={() => setTipoMovimiento('salida')}
                      className={`py-3 rounded-xl font-bold text-xs tracking-wider uppercase border transition-all cursor-pointer ${
                        tipoMovimiento === 'salida'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                      }`}
                    >
                      Adelanto (Salida)
                    </button>
                  </div>
                </div>

                {tipoMovimiento === 'entrada' ? (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Seleccionar Producto *</label>
                      <select
                        value={selectedProductId}
                        onChange={(e) => handleChargeProductSelect(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-zinc-100 focus:outline-none focus:border-blue-500 transition-all text-xs"
                        required
                      >
                        <option value="">-- Elige un producto --</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.nombre} ({formatCOP(Number(p.precio))})</option>
                        ))}
                      </select>
                    </div>

                    {selectedProductId && (
                      <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 flex justify-between items-center text-xs">
                        <span className="text-zinc-400">Precio unitario:</span>
                        <span className="font-bold text-zinc-200">
                          {formatCOP(selectedProductPrice)}
                        </span>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Cantidad *</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="Ej. 10"
                        value={cantidad}
                        onChange={(e) => setCantidad(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-all text-xs"
                        required
                      />
                    </div>

                    {cantidad && !isNaN(parseFloat(cantidad)) && parseFloat(cantidad) > 0 && selectedProductId && (
                      <div className="p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10 flex justify-between items-center text-xs">
                        <span className="text-emerald-400/80 font-medium">Valor total del producto:</span>
                        <span className="font-bold text-emerald-400">
                          {formatCOP(parseFloat(cantidad) * selectedProductPrice, true)}
                        </span>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Comentario / Nota (Opcional)</label>
                      <input
                        type="text"
                        placeholder="Ej. Leche de buena calidad"
                        value={comentario}
                        onChange={(e) => setComentario(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-all"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Adelanto de Dinero ($ COP) *</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={monto}
                        onChange={(e) => setMonto(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-all"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Entregado a (Opcional)</label>
                      <input
                        type="text"
                        placeholder="Ej. Nombre del familiar"
                        value={solicitadoPor}
                        onChange={(e) => setSolicitadoPor(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Comentario / Nota (Opcional)</label>
                      <input
                        type="text"
                        placeholder="Ej. Adelanto del sábado"
                        value={comentario}
                        onChange={(e) => setComentario(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-all"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Fecha</label>
                  <input
                    type="date"
                    value={fechaMovimiento}
                    onChange={(e) => setFechaMovimiento(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-all"
                    required
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-zinc-800/80">
                  <button
                    type="button"
                    onClick={() => setIsChargeModalOpen(false)}
                    className="flex-1 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 font-semibold py-3 rounded-xl transition-all cursor-pointer text-center text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-all cursor-pointer text-center text-sm shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: LIQUIDAR CUENTA DE PROVEEDOR */}
      <AnimatePresence>
        {isLiquidationModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLiquidationModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-full md:max-w-md bg-zinc-900 border-t md:border border-zinc-800 rounded-t-3xl md:rounded-2xl p-6 shadow-2xl z-10 overflow-hidden"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-zinc-100">Liquidar Cuenta de Proveedor</h2>
                <button
                  onClick={() => setIsLiquidationModalOpen(false)}
                  className="p-1 rounded-full bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-850 mb-4 text-center">
                <span className="text-[10px] text-zinc-500 font-semibold block uppercase">
                  {currentBalance < 0 ? 'Monto a Favor de la Lechería' : 'Monto por Pagar al Proveedor'}
                </span>
                <span className={`text-xl font-bold block mt-1 ${currentBalance < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {formatCOP(currentBalance, true)}
                </span>
              </div>

              <form onSubmit={handleConfirmLiquidation} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                    {currentBalance < 0 ? 'Monto Cobrado (Recibido) *' : 'Monto Pagado (Entregado) *'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={montoPagadoInput}
                    onChange={(e) => setMontoPagadoInput(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-zinc-100 focus:outline-none focus:border-blue-500 transition-all"
                    required
                  />
                </div>

                {(() => {
                  const paidVal = parseFloat(montoPagadoInput) || 0;
                  const balanceAbs = Math.abs(currentBalance);
                  const debt = Math.max(0, balanceAbs - paidVal);
                  if (debt > 0) {
                    return (
                      <div className="p-3 bg-red-500/5 rounded-xl border border-red-500/10 flex justify-between items-center text-xs">
                        <span className="text-red-400/80 font-semibold text-left">SALDO RESTANTE (QUEDA PENDIENTE PARA EL PRÓXIMO CICLO):</span>
                        <span className="font-bold text-red-500 text-right">
                          {formatCOP(debt)}
                        </span>
                      </div>
                    );
                  }
                  return (
                    <div className="p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10 flex justify-between items-center text-xs text-center">
                      <span className="text-emerald-400/80 font-semibold">PERIODO LIQUIDADO COMPLETO</span>
                    </div>
                  );
                })()}

                <div className="flex gap-3 pt-4 border-t border-zinc-800/80">
                  <button
                    type="button"
                    onClick={() => setIsLiquidationModalOpen(false)}
                    className="flex-1 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 font-semibold py-3 rounded-xl transition-all cursor-pointer text-center text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-all cursor-pointer text-center text-sm shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20"
                  >
                    Confirmar y Emitir
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: LIQUIDACIÓN / VISTA PREVIA PROFESIONAL */}
      <AnimatePresence>
        {isInvoiceModalOpen && activeInvoiceForPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsInvoiceModalOpen(false)}
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full sm:max-w-2xl bg-zinc-900 border-t sm:border border-zinc-800 rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl flex flex-col max-h-[100vh] sm:max-h-[90vh] z-10 overflow-hidden"
            >
              <div className="flex justify-between items-center mb-4 border-b border-zinc-850 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="text-blue-400" size={18} />
                  <h2 className="text-base font-bold text-zinc-100">Vista Previa de Liquidación</h2>
                </div>
                <button
                  onClick={() => setIsInvoiceModalOpen(false)}
                  className="p-1 rounded-full bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-6 pb-6">
                <div className="bg-white text-zinc-950 p-6 rounded-xl space-y-6 shadow-md border border-zinc-200 relative overflow-hidden">
                  {activeInvoiceForPreview.estado && (
                    <div className="absolute top-6 right-[-18px] z-10 pointer-events-none select-none">
                      <div
                        className={`px-6 py-1.5 text-xs font-black uppercase tracking-[0.2em] border-2 rounded-sm transform rotate-[20deg] opacity-80 ${
                          activeInvoiceForPreview.estado === 'pagado'
                            ? 'text-emerald-600 border-emerald-500 bg-emerald-50/60'
                            : 'text-red-600 border-red-500 bg-red-50/60'
                        }`}
                        style={{ textShadow: '0 0 1px currentColor' }}
                      >
                        {activeInvoiceForPreview.estado === 'pagado' ? '✓ LIQUIDADO' : '⏳ PENDIENTE'}
                      </div>
                    </div>
                  )}
                  
                  {/* Encabezado */}
                  <div className="flex justify-between items-start gap-4 pb-4 border-b border-zinc-200">
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Comprador</span>
                      <h3 className="text-lg font-black tracking-tight text-zinc-900">{profile?.nombre_negocio || 'Mi Negocio'}</h3>
                      <p className="text-[10px] text-zinc-500 leading-normal max-w-xs">
                        {profile?.direccion && <span>{profile.direccion}<br/></span>}
                        {profile?.telefono && <span>Tel: {profile.telefono}<br/></span>}
                        {profile?.nit && <span>NIT: {profile.nit}</span>}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-extrabold text-zinc-400 tracking-wider block uppercase">Liquidación de Compra</span>
                      <span className="text-md font-black text-blue-600 block">{activeInvoiceForPreview.numero_factura}</span>
                      <span className="text-[9px] text-zinc-500 block mt-1">Fecha: {new Date(activeInvoiceForPreview.fecha_emision).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Proveedor */}
                  <div className="bg-zinc-50 p-3 rounded-lg flex flex-col space-y-1">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Proveedor / Acopio de</span>
                    <span className="text-xs font-bold text-zinc-900">{selectedClient?.nombre}</span>
                    <span className="text-[10px] text-zinc-500">
                      {selectedClient?.telefono && <span>Tel: {selectedClient.telefono} | </span>}
                      {selectedClient?.direccion && <span>Dirección: {selectedClient.direccion}</span>}
                    </span>
                  </div>

                  {/* Conceptos */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-12 text-[10px] font-black uppercase text-zinc-400 border-b border-zinc-200 pb-1 px-1">
                      <span className="col-span-2">Fecha</span>
                      <span className="col-span-4">Concepto</span>
                      <span className="col-span-2 text-right">Cant</span>
                      <span className="col-span-2 text-right">P. Unit</span>
                      <span className="col-span-2 text-right">Total</span>
                    </div>

                    <div className="divide-y divide-zinc-100 px-1">
                      {previewItems.map((it: any, idx: number) => (
                        <div key={idx} className="grid grid-cols-12 py-2 text-xs text-zinc-800">
                          <span className="col-span-2 text-zinc-500">{formatItemDate(it.fecha) || '-'}</span>
                          <span className="col-span-4 break-words pr-2">{it.descripcion}</span>
                          <span className="col-span-2 text-right">{it.cantidad}</span>
                          <span className="col-span-2 text-right">{formatCOP(Number(it.precio_unitario))}</span>
                          <span className="col-span-2 text-right font-semibold text-zinc-900">{formatCOP(Number(it.total))}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Totales */}
                  <div className="border-t border-zinc-250 pt-4 flex flex-col items-end space-y-1.5">
                    <div className="flex justify-between w-48 text-xs text-zinc-500">
                      <span>Total Acumulado del Periodo:</span>
                      <span className="font-semibold">{formatCOP(Number(activeInvoiceForPreview.total))}</span>
                    </div>
                    {activeInvoiceForPreview.deuda_pendiente !== undefined && Number(activeInvoiceForPreview.deuda_pendiente) > 0 ? (
                      <>
                        <div className="flex justify-between w-48 text-xs text-zinc-500">
                          <span>Total Pagado:</span>
                          <span className="font-semibold">{formatCOP(Number(activeInvoiceForPreview.monto_pagado || 0))}</span>
                        </div>
                        <div className="flex justify-between w-48 text-sm font-black text-red-650 bg-red-50/70 p-2 rounded-lg border border-red-200/50">
                          <span>SALDO PENDIENTE:</span>
                          <span>{formatCOP(Number(activeInvoiceForPreview.deuda_pendiente))}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between w-48 text-sm font-black text-zinc-900 bg-zinc-100 p-2 rounded-lg">
                        <span>NETO POR PAGAR:</span>
                        <span>{formatCOP(Number(activeInvoiceForPreview.total))}</span>
                      </div>
                    )}
                  </div>

                  <div className="text-center pt-4 border-t border-dashed border-zinc-200">
                    <p className="text-[9px] text-zinc-400 font-medium italic">Comprobante de liquidación de acopio y entregas de producto.</p>
                  </div>
                </div>
              </div>

              {/* Botones Accion */}
              <div className="flex flex-col gap-2.5 border-t border-zinc-850 pt-4 mt-auto">
                <div className="flex gap-2">
                  <button
                    onClick={() => printBluetoothESCPOSTicket(activeInvoiceForPreview)}
                    disabled={isPrintingBt}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 text-xs shadow-lg shadow-indigo-600/10"
                  >
                    <Bluetooth size={15} className={isPrintingBt ? 'animate-pulse' : ''} />
                    {isPrintingBt ? 'Conectando e Imprimiendo...' : 'Imprimir Ticket (Bluetooth)'}
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => printThermalTicket(activeInvoiceForPreview)}
                    className="flex-1 bg-zinc-850 hover:bg-zinc-800 text-zinc-200 font-semibold py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 text-xs"
                  >
                    <Printer size={15} />
                    Imprimir (PC/Celular)
                  </button>
                  <button
                    onClick={() => exportToPDF(activeInvoiceForPreview)}
                    className="flex-1 bg-blue-650/10 hover:bg-blue-650/20 text-blue-400 font-bold py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 text-xs border border-blue-500/20"
                  >
                    <Download size={15} />
                    Guardar PDF
                  </button>
                  <button
                    onClick={() => setIsInvoiceModalOpen(false)}
                    className="px-4 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 font-semibold py-3 rounded-xl transition-all cursor-pointer text-center text-xs border border-zinc-800"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: EDITAR / CORREGIR FACTURA EMITIDA */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSavingEdit && setIsEditModalOpen(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-full md:max-w-2xl bg-zinc-900 border-t md:border border-zinc-800 rounded-t-3xl md:rounded-2xl p-6 shadow-2xl z-10 flex flex-col max-h-[100vh] md:max-h-[90vh] overflow-hidden"
            >
              <div className="flex justify-between items-center mb-4 border-b border-zinc-850 pb-3">
                <div className="flex items-center gap-2">
                  <Pencil className="text-blue-400" size={18} />
                  <h2 className="text-base font-bold text-zinc-100">Corregir Liquidación</h2>
                </div>
                <button
                  onClick={() => !isSavingEdit && setIsEditModalOpen(false)}
                  className="p-1 rounded-full bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mb-4 p-3 rounded-xl bg-blue-500/5 border border-blue-500/15 text-[11px] text-blue-300/90 leading-relaxed">
                Al guardar, se generará una liquidación corregida con un <span className="font-bold">número de factura nuevo</span> y la anterior será reemplazada.
              </div>

              {editError && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>{editError}</span>
                </div>
              )}

              <form onSubmit={handleSaveEdit} className="flex-1 flex flex-col overflow-hidden">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Conceptos</h3>
                  <button
                    type="button"
                    onClick={addEditItem}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-xs font-bold text-blue-400 rounded-lg cursor-pointer transition-all"
                  >
                    <Plus size={14} />
                    Añadir Línea
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {editItems.length === 0 ? (
                    <div className="text-center py-10 bg-zinc-900/10 border border-zinc-800/30 rounded-2xl p-6">
                      <Boxes className="mx-auto text-zinc-650 mb-3" size={28} />
                      <p className="text-xs text-zinc-400 font-semibold">Sin conceptos</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Presiona &quot;Añadir Línea&quot; para agregar uno.</p>
                    </div>
                  ) : (
                    editItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col gap-3 p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/60 relative"
                      >
                        {/* Fila 1: Producto + Descripción + Fecha */}
                        <div className="flex flex-col sm:flex-row gap-3">
                          <div className="flex-1">
                            <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Producto</label>
                            <select
                              value={item.product_id || ''}
                              onChange={(e) => handleEditProductSelect(item.id, e.target.value)}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 text-xs text-zinc-300 focus:outline-none"
                            >
                              <option value="">-- Seleccionar del Catálogo --</option>
                              {products.map(p => (
                                <option key={p.id} value={p.id}>{p.nombre} ({formatCOP(p.precio)})</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex-1">
                            <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Descripción</label>
                            <input
                              type="text"
                              placeholder="Detalle del concepto..."
                              value={item.descripcion}
                              onChange={(e) => handleEditItemChange(item.id, 'descripcion', e.target.value)}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 text-xs text-zinc-100 focus:outline-none"
                              required
                            />
                          </div>
                          <div className="w-full sm:w-36">
                            <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Fecha</label>
                            <input
                              type="date"
                              value={item.fecha}
                              onChange={(e) => handleEditItemChange(item.id, 'fecha', e.target.value)}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 text-xs text-zinc-100 focus:outline-none"
                            />
                          </div>
                        </div>

                        {/* Fila 2: Cantidad + Precio + Total + Remover */}
                        <div className="flex gap-3 items-end">
                          <div className="w-20">
                            <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Cantidad</label>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              placeholder="0"
                              value={item.cantidad || ''}
                              onChange={(e) => handleEditItemChange(item.id, 'cantidad', parseFloat(e.target.value) || 0)}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-2 text-center text-xs text-zinc-100 focus:outline-none"
                              required
                            />
                          </div>
                          <div className="w-28">
                            <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                              Precio Unit. {item.fromCatalog && <span className="text-blue-400 normal-case">(catálogo)</span>}
                            </label>
                            <input
                              type="number"
                              step="any"
                              placeholder="$ 0"
                              value={item.precio_unitario || ''}
                              onChange={(e) => handleEditItemChange(item.id, 'precio_unitario', parseFloat(e.target.value) || 0)}
                              readOnly={item.fromCatalog}
                              className={`w-full border rounded-lg py-2 px-3 text-right text-xs focus:outline-none ${
                                item.fromCatalog
                                  ? 'bg-zinc-900 border-zinc-700 text-blue-300 cursor-not-allowed'
                                  : 'bg-zinc-950 border-zinc-800 text-zinc-100'
                              }`}
                              required
                            />
                          </div>
                          <div className="w-24 text-right">
                            <span className="block text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Total</span>
                            <span className="text-xs font-bold text-zinc-200">{formatCOP(item.total)}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveEditItem(item.id)}
                            className="p-2 rounded-lg bg-zinc-850 hover:bg-red-950/20 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer mb-0.5"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Estado y Total */}
                <div className="border-t border-zinc-850 pt-4 mt-4 space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Estado del Pago</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setEditEstado('pendiente')}
                        className={`py-2.5 rounded-xl font-bold text-xs tracking-wider uppercase border transition-all cursor-pointer ${
                          editEstado === 'pendiente'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                        }`}
                      >
                        Saldo Pendiente
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditEstado('pagado')}
                        className={`py-2.5 rounded-xl font-bold text-xs tracking-wider uppercase border transition-all cursor-pointer ${
                          editEstado === 'pagado'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                        }`}
                      >
                        Pagado / Liquidado
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500 font-semibold uppercase">Total Corregido</span>
                    <span className="text-xl font-black text-blue-400 tracking-tight">{formatCOP(editSubtotal)}</span>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIsEditModalOpen(false)}
                      disabled={isSavingEdit}
                      className="flex-1 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 font-semibold py-3 rounded-xl transition-all cursor-pointer text-center text-sm disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingEdit}
                      className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all cursor-pointer text-center text-sm shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSavingEdit ? (
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <>Guardar Corrección</>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>

      {/* 3. AREA DE IMPRESION TÉRMICA */}
      <div className="print-area hidden">
        <div style={{ fontFamily: 'Courier New, Courier, monospace', fontSize: '11px', color: '#000000', lineHeight: '1.2' }}>
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 'bold', display: 'block' }}>{profile?.nombre_negocio || 'Mi Negocio'}</span>
            {profile?.nombre_propietario && <span style={{ display: 'block' }}>Prop: {profile.nombre_propietario}</span>}
            {profile?.nit && <span style={{ display: 'block' }}>NIT: {profile.nit}</span>}
            {profile?.telefono && <span style={{ display: 'block' }}>Tel: {profile.telefono}</span>}
            {profile?.direccion && <span style={{ display: 'block' }}>Dir: {profile.direccion}</span>}
            <span>================================</span>
          </div>

          <div style={{ marginBottom: '8px' }}>
            {activeInvoiceForPreview && (
              <>
                <span style={{ fontWeight: 'bold' }}>LIQUIDACIÓN: {activeInvoiceForPreview.numero_factura}</span><br />
                <span>FECHA: {new Date(activeInvoiceForPreview.fecha_emision).toLocaleString()}</span><br />
                <span>ESTADO: {activeInvoiceForPreview.estado === 'pagado' ? 'LIQUIDADA' : 'PENDIENTE'}</span>
              </>
            )}
            <br />
            {activeInvoiceForPreview && (
              <div style={{
                textAlign: 'center',
                margin: '6px 0',
                padding: '4px 0',
                border: `2px solid ${activeInvoiceForPreview.estado === 'pagado' ? '#10B981' : '#EF4444'}`,
                fontWeight: 'bold',
                fontSize: '14px',
                letterSpacing: '3px',
                color: activeInvoiceForPreview.estado === 'pagado' ? '#10B981' : '#EF4444',
              }}>
                {activeInvoiceForPreview.estado === 'pagado' ? '✓ LIQUIDADA' : '⏳ PENDIENTE'}
              </div>
            )}
            <span>================================</span>
          </div>

          <div style={{ marginBottom: '8px' }}>
            <span style={{ fontWeight: 'bold' }}>PROVEEDOR:</span> {selectedClient?.nombre}<br />
            {selectedClient?.telefono && <span>TEL: {selectedClient.telefono}<br /></span>}
            {selectedClient?.direccion && <span>DIR: {selectedClient.direccion}</span>}
            <span>================================</span>
          </div>

          {/* Listado */}
          <div style={{ marginBottom: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', borderBottom: '1px solid #000' }}>DESCRIPCIÓN</th>
                  <th style={{ textAlign: 'right', borderBottom: '1px solid #000' }}>CANT</th>
                  <th style={{ textAlign: 'right', borderBottom: '1px solid #000' }}>TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {previewItems.map((it: any, idx: number) => (
                  <tr key={idx}>
                    <td style={{ padding: '3px 0', wordBreak: 'break-word' }}>
                      {it.fecha && <div style={{ fontSize: '9px', color: '#444' }}>{formatItemDate(it.fecha)}</div>}
                      {it.descripcion}
                    </td>
                    <td style={{ textAlign: 'right', padding: '3px 0' }}>{it.cantidad}</td>
                    <td style={{ textAlign: 'right', padding: '3px 0', whiteSpace: 'nowrap' }}>{formatCOP(Number(it.total))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <span>================================</span>
          </div>

          {/* Totales */}
          {activeInvoiceForPreview && (
            <div style={{ textAlign: 'right', marginBottom: '12px' }}>
              <span>TOTAL ACUMULADO: {formatCOP(Number(activeInvoiceForPreview.subtotal))}</span><br />
              {activeInvoiceForPreview.deuda_pendiente !== undefined && Number(activeInvoiceForPreview.deuda_pendiente) > 0 ? (
                <>
                  <span>MONTO PAGADO: {formatCOP(Number(activeInvoiceForPreview.monto_pagado || 0))}</span><br />
                  <span style={{ fontWeight: 'bold', fontSize: '12px', color: '#EF4444' }}>SALDO PENDIENTE: {formatCOP(Number(activeInvoiceForPreview.deuda_pendiente))}</span>
                </>
              ) : (
                <span style={{ fontWeight: 'bold', fontSize: '12px' }}>NETO POR PAGAR: {formatCOP(Number(activeInvoiceForPreview.total))}</span>
              )}
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: '15px' }}>
            <span>================================</span><br />
            <span style={{ fontWeight: 'bold' }}>¡LIQUIDACIÓN GENERADA CON ÉXITO!</span><br />
            <span>SOPORTE DE ENTREGAS Y PAGOS</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm text-zinc-400">Cargando cuentas corrientes...</p>
      </div>
    }>
      <BillingContent />
    </Suspense>
  );
}
