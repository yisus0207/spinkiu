'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import { jsPDF } from 'jspdf';
import { 
  FileText, 
  ArrowLeft, 
  Users, 
  Plus, 
  Trash2, 
  Boxes, 
  Printer, 
  Download, 
  Bluetooth,
  CheckCircle,
  AlertCircle,
  X,
  Building2
} from 'lucide-react';

interface SelectedItem {
  id: string; // temporary local id
  product_id: string | null; // references product catalog
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  total: number;
  maxStock: number | null; // for stock checking
}

const formatCOP = (val: number, showSign = false) => {
  const formattedVal = Math.abs(val).toLocaleString('es-CO', { minimumFractionDigits: 0 });
  if (val < 0) {
    return `- $ ${formattedVal}`;
  }
  return showSign ? `+ $ ${formattedVal}` : `$ ${formattedVal}`;
};

export default function ManualBillingPage() {
  const router = useRouter();
  
  const { 
    clients: providers, 
    products, 
    fetchClients: fetchProviders, 
    fetchProducts, 
    generateInvoice: generateSettlement, 
    profile, 
    invoices,
    isLoading 
  } = useStore();

  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [estado, setEstado] = useState<'pendiente' | 'pagado'>('pendiente');
  const [error, setError] = useState<string | null>(null);
  
  // Factura creada para preview
  const [createdInvoice, setCreatedInvoice] = useState<any>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isPrintingBt, setIsPrintingBt] = useState(false);
  const [btError, setBtError] = useState<string | null>(null);

  useEffect(() => {
    fetchProviders();
    fetchProducts();
  }, [fetchProviders, fetchProducts]);

  // Agregar fila vacía
  const handleAddItemRow = () => {
    const newItem: SelectedItem = {
      id: Math.random().toString(36).substr(2, 9),
      product_id: null,
      descripcion: '',
      cantidad: 1,
      precio_unitario: 0,
      total: 0,
      maxStock: null
    };
    setSelectedItems([...selectedItems, newItem]);
  };

  // Eliminar fila
  const handleRemoveItemRow = (id: string) => {
    setSelectedItems(selectedItems.filter(item => item.id !== id));
  };

  // Al cambiar selección de producto de inventario
  const handleProductSelect = (id: string, productId: string) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    setSelectedItems(selectedItems.map(item => {
      if (item.id === id) {
        const qty = item.cantidad;
        const price = Number(prod.precio);
        return {
          ...item,
          product_id: prod.id,
          descripcion: prod.nombre,
          precio_unitario: price,
          total: qty * price,
          maxStock: prod.stock
        };
      }
      return item;
    }));
  };

  // Al cambiar campos de entrada
  const handleItemChange = (id: string, field: keyof SelectedItem, value: any) => {
    setSelectedItems(selectedItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value } as SelectedItem;
        
        // Recalcular total de línea
        if (field === 'cantidad' || field === 'precio_unitario') {
          updated.total = Number(updated.cantidad) * Number(updated.precio_unitario);
        }
        
        // Validación de stock local rápida
        if (field === 'cantidad' && updated.maxStock !== null && updated.cantidad > updated.maxStock) {
          setError(`Alerta: Stock limitado. Solo quedan ${updated.maxStock} unidades en inventario.`);
          setTimeout(() => setError(null), 3000);
        }

        return updated;
      }
      return item;
    }));
  };

  // Cálculos totales
  const subtotal = selectedItems.reduce((sum, item) => sum + item.total, 0);
  const total = subtotal;

  const handleGenerateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedProviderId) {
      setError('Por favor selecciona un proveedor.');
      return;
    }

    if (selectedItems.length === 0) {
      setError('Debes agregar al menos un ítem a la liquidación.');
      return;
    }

    // Validar ítems
    for (const it of selectedItems) {
      if (!it.descripcion.trim()) {
        setError('Todos los ítems deben tener una descripción.');
        return;
      }
      if (it.cantidad <= 0 || it.precio_unitario < 0) {
        setError('La cantidad y el precio deben ser mayores a 0.');
        return;
      }
      if (it.maxStock !== null && it.cantidad > it.maxStock) {
        setError(`El ítem "${it.descripcion}" excede el stock disponible (${it.maxStock} unidades).`);
        return;
      }
    }

    try {
      // Mapear items al payload
      const itemsPayload = selectedItems.map(it => ({
        product_id: it.product_id,
        descripcion: it.descripcion,
        cantidad: it.cantidad,
        precio_unitario: it.precio_unitario,
        total: it.total
      }));

      const invoice = await generateSettlement(
        selectedProviderId,
        itemsPayload,
        subtotal,
        total,
        estado
      );

      setCreatedInvoice({
        ...invoice,
        charges: [], // no charges
        items: itemsPayload
      });
      
      setIsInvoiceModalOpen(true);
      
      // Reiniciar formulario
      setSelectedProviderId('');
      setSelectedItems([]);
    } catch (err: any) {
      setError(err.message || 'Error al generar la liquidación.');
    }
  };

  // --- IMPRESIÓN Y PDF ---
  const exportToPDF = (invoice: any) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter'
    });

    const provider = providers.find(c => c.id === invoice.cliente_id) || { nombre: 'Proveedor Genérico', nit: 'C/F', telefono: '', direccion: '' };
    const items = invoice.items || [];

    // --- COLORES & ESTILOS ---
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

    // --- ENCABEZADO ---
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(19);
    doc.text(profile?.nombre_negocio || 'Mi Negocio', 45, 21);

    doc.setTextColor(148, 163, 184); // Slate 400
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('COMPROBANTE DE LIQUIDACIÓN COMERCIAL', 45, 27);

    doc.setTextColor(203, 213, 225); // Slate 300
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`NIT: ${profile?.nit || 'CF'}`, 195, 15, { align: 'right' });
    doc.text(`Tel: ${profile?.telefono || 'N/A'}`, 195, 20.5, { align: 'right' });
    const dirLines = doc.splitTextToSize(`Dirección: ${profile?.direccion || 'N/A'}`, 75);
    dirLines.slice(0, 2).forEach((line: string, i: number) => {
      doc.text(line, 195, 26 + i * 4, { align: 'right' });
    });

    // --- DETALLES ---
    doc.setFillColor(252, 253, 254);
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setLineWidth(0.3);
    doc.roundedRect(15, 52, 98, 28, 2, 2, 'FD');
    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.roundedRect(15, 52, 1.4, 28, 0.7, 0.7, 'F');

    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('LIQUIDACIÓN COMPRA A:', 20, 58);
    
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(provider.nombre || 'Proveedor Genérico', 20, 64);
    
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFontSize(9);
    doc.text(`Teléfono: ${provider.telefono || 'N/A'}`, 20, 69);
    doc.text(`Dirección: ${provider.direccion || 'N/A'}`, 20, 74);

    doc.setFillColor(252, 253, 254);
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setLineWidth(0.3);
    doc.roundedRect(122, 52, 73, 28, 2, 2, 'FD');
    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.roundedRect(122, 52, 1.4, 28, 0.7, 0.7, 'F');

    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text('CUENTA DE COBRO', 127, 58);
    
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFontSize(9.5);
    doc.text(`NÚMERO: ${invoice.numero_factura}`, 127, 64);
    
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`Fecha Emisión: ${new Date(invoice.fecha_emision).toLocaleDateString('es-CO')}`, 127, 69);
    
    const isPaid = invoice.estado === 'pagado';
    doc.setTextColor(isPaid ? 16 : 217, isPaid ? 124 : 119, isPaid ? 65 : 6);
    doc.setFont('Helvetica', 'bold');
    doc.text(`Estado: ${isPaid ? 'LIQUIDADA' : 'PENDIENTE'}`, 127, 74);

    // --- TABLA DE CONCEPTOS ---
    let y = 92;

    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.roundedRect(15, y - 5, 180, 8, 1, 1, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('Descripción de Producto / Concepto', 18, y);
    doc.text('Cant.', 125, y, { align: 'right' });
    doc.text('Precio U.', 155, y, { align: 'right' });
    doc.text('Total', 190, y, { align: 'right' });

    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    y += 8;

    items.forEach((it: any, index: number) => {
      const descLines = doc.splitTextToSize(it.descripcion, 100);
      const rowHeight = Math.max(7.5, descLines.length * 4 + 2);

      if (index % 2 === 0) {
        doc.setFillColor(grayLight[0], grayLight[1], grayLight[2]);
        doc.rect(15, y - 4, 180, rowHeight, 'F');
      }

      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.setLineWidth(0.2);
      doc.line(15, y + rowHeight - 4, 195, y + rowHeight - 4);

      descLines.forEach((line: string, lineIndex: number) => {
        doc.text(line, 18, y + (lineIndex * 4));
      });

      doc.text(String(it.cantidad), 125, y, { align: 'right' });
      doc.text(formatCOP(Number(it.precio_unitario)), 155, y, { align: 'right' });
      doc.text(formatCOP(Number(it.total)), 190, y, { align: 'right' });

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
        doc.text('Descripción de Producto / Concepto', 18, y);
        doc.text('Cant.', 125, y, { align: 'right' });
        doc.text('Precio U.', 155, y, { align: 'right' });
        doc.text('Total', 190, y, { align: 'right' });
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        doc.setFont('Helvetica', 'normal');
        y += 8;
      }
    });

    // --- TOTALES ---
    y += 4;
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(0.5);
    doc.line(125, y, 195, y);
    y += 6;

    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('SUBTOTAL:', 130, y);
    doc.setFont('Helvetica', 'normal');
    doc.text(formatCOP(Number(invoice.subtotal)), 190, y, { align: 'right' });

    y += 7;
    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.roundedRect(125, y - 5, 70, 8, 1.5, 1.5, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text('TOTAL COMPRA:', 130, y);
    doc.text(formatCOP(Number(invoice.total)), 190, y, { align: 'right' });

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

    const nameSafe = provider.nombre.replace(/\s+/g, '_');
    doc.save(`${invoice.numero_factura}_${nameSafe}.pdf`);
  };

  const printThermalTicket = () => {
    setTimeout(() => {
      window.print();
    }, 200);
  };

  const printBluetoothESCPOSTicket = async (invoice: any) => {
    if (typeof navigator === 'undefined' || !(navigator as any).bluetooth) {
      alert('Tu navegador o dispositivo no soporta Web Bluetooth. Usa Chrome o Edge en Android/PC.');
      return;
    }

    setIsPrintingBt(true);
    setBtError(null);

    try {
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

      let service;
      try {
        service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
      } catch (e) {
        try {
          service = await server.getPrimaryService('00001101-0000-1000-8000-00805f9b34fb');
        } catch (e2) {
          throw new Error('No se encontró un servicio de impresión estándar (0x18F0 o 0x1101) en esta impresora.');
        }
      }

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

      const provider = providers.find(c => c.id === invoice.cliente_id) || { nombre: 'Proveedor Genérico' };
      const items = invoice.items || [];

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
      ticket += `Proveedor: ${provider.nombre.slice(0, 20)}` + lineBreak;
      const isPaid = invoice.estado === 'pagado';
      ticket += `Estado: ${isPaid ? 'LIQUIDADA' : 'PENDIENTE'}` + lineBreak;
      ticket += '-'.repeat(32) + lineBreak;

      // Tabla de Conceptos
      ticket += boldOn + formatLine('Concepto', 'Total') + boldOff + lineBreak;
      ticket += '-'.repeat(32) + lineBreak;

      items.forEach((it: any) => {
        const desc = it.descripcion;
        const totalStr = formatCOP(Number(it.total));
        if (desc.length > 20) {
          ticket += desc + lineBreak;
          ticket += formatLine(`  ${it.cantidad} x ${formatCOP(Number(it.precio_unitario))}`, totalStr) + lineBreak;
        } else {
          ticket += formatLine(`${desc} x${it.cantidad}`, totalStr) + lineBreak;
        }
      });
      ticket += '-'.repeat(32) + lineBreak;

      // Totales
      ticket += formatLine('SUBTOTAL:', formatCOP(Number(invoice.subtotal))) + lineBreak;
      ticket += boldOn + formatLine('TOTAL COMPRA:', formatCOP(Number(invoice.total))) + boldOff + lineBreak;
      
      ticket += lineBreak + center + 'Gracias por su entrega!' + lineBreak + lineBreak + lineBreak + lineBreak + cut;

      const encoder = new TextEncoder();
      const bytes = encoder.encode(ticket);
      const chunkSize = 20;
      
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.slice(i, i + chunkSize);
        await characteristic.writeValue(chunk);
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

  const activeProviderName = providers.find(c => c.id === createdInvoice?.cliente_id)?.nombre || 'Proveedor General';

  return (
    <div className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full flex flex-col space-y-6">
      <div className="flex-1 flex flex-col space-y-6 no-print">
        {/* Cabecera */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/providers')}
          className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer shrink-0"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <span className="text-xs font-bold text-blue-500 uppercase tracking-widest">Liquidación</span>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-100 mt-0.5">Crear Liquidación Manual</h1>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Formulario Principal */}
      <form onSubmit={handleGenerateInvoice} className="space-y-6">
        
        {/* Selector de Proveedor y Estado */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-zinc-900/40 border border-zinc-800/80 p-5 rounded-2xl">
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Seleccionar Proveedor *</label>
            <select
              value={selectedProviderId}
              onChange={(e) => setSelectedProviderId(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-zinc-100 focus:outline-none focus:border-blue-500 transition-all"
              required
            >
              <option value="">-- Elige un proveedor --</option>
              {providers.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Estado del Pago</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEstado('pendiente')}
                className={`py-3 rounded-xl font-bold text-xs tracking-wider uppercase border transition-all cursor-pointer ${
                  estado === 'pendiente'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                }`}
              >
                Saldo Pendiente
              </button>
              <button
                type="button"
                onClick={() => setEstado('pagado')}
                className={`py-3 rounded-xl font-bold text-xs tracking-wider uppercase border transition-all cursor-pointer ${
                  estado === 'pagado'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                }`}
              >
                Liquidada / Pagada
              </button>
            </div>
          </div>
        </div>

        {/* Tabla de ítems */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">Conceptos / Detalle de Compra</h2>
            <button
              type="button"
              onClick={handleAddItemRow}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-xs font-bold text-blue-400 rounded-lg cursor-pointer transition-all"
            >
              <Plus size={14} />
              Añadir Línea
            </button>
          </div>

          {selectedItems.length === 0 ? (
            <div className="text-center py-12 bg-zinc-900/10 border border-zinc-800/30 rounded-2xl">
              <Boxes className="mx-auto text-zinc-650 mb-3" size={32} />
              <p className="text-sm text-zinc-400 font-semibold">Liquidación vacía</p>
              <p className="text-xs text-zinc-500 mt-1">Presiona &quot;Añadir Línea&quot; para ingresar conceptos o productos.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedItems.map((item, idx) => (
                <div 
                  key={item.id}
                  className="flex flex-col md:flex-row gap-3 p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/60 items-start md:items-center relative"
                >
                  <div className="w-full md:w-auto md:flex-1">
                    <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Producto o Concepto</label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <select
                        onChange={(e) => handleProductSelect(item.id, e.target.value)}
                        className="bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 text-xs text-zinc-300 focus:outline-none w-full sm:w-48"
                      >
                        <option value="">-- Seleccionar de Catálogo --</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.nombre} ({formatCOP(p.precio)})</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Descripción manual del concepto..."
                        value={item.descripcion}
                        onChange={(e) => handleItemChange(item.id, 'descripcion', e.target.value)}
                        className="bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 text-xs text-zinc-100 focus:outline-none flex-1"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 w-full md:w-auto items-center">
                    <div className="w-16">
                      <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Cant.</label>
                      <input
                        type="number"
                        min="1"
                        value={item.cantidad}
                        onChange={(e) => handleItemChange(item.id, 'cantidad', parseInt(e.target.value) || 1)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-2 text-center text-xs text-zinc-100 focus:outline-none"
                        required
                      />
                    </div>

                    <div className="w-24">
                      <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Precio Unit.</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="$ 0.00"
                        value={item.precio_unitario || ''}
                        onChange={(e) => handleItemChange(item.id, 'precio_unitario', parseFloat(e.target.value) || 0)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 text-right text-xs text-zinc-100 focus:outline-none"
                        required
                      />
                    </div>

                    <div className="w-24 text-right">
                      <span className="block text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Total</span>
                      <span className="text-xs font-bold text-zinc-200">{formatCOP(item.total)}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveItemRow(item.id)}
                      className="p-2 rounded-lg bg-zinc-850 hover:bg-red-950/20 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer self-end md:self-auto mt-4 md:mt-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resumen y Envío */}
        {selectedItems.length > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-900/40 border border-zinc-800/80 p-5 rounded-2xl">
            <div className="text-left">
              <span className="text-xs text-zinc-500 font-semibold uppercase block">Total Compra</span>
              <span className="text-2xl font-black text-blue-400 tracking-tight">{formatCOP(total)}</span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3.5 rounded-xl text-sm transition-all cursor-pointer shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 flex items-center justify-center gap-2"
            >
              <FileText size={18} />
              Emitir y Previsualizar Liquidación
            </button>
          </div>
        )}
      </form>

      {/* MODAL PREVIEW LIQUIDACIÓN */}
      <AnimatePresence>
        {isInvoiceModalOpen && createdInvoice && (
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
                  <CheckCircle className="text-emerald-400 animate-pulse" size={18} />
                  <h2 className="text-base font-bold text-zinc-100">Liquidación Emitida Exitosamente</h2>
                </div>
                <button
                  onClick={() => setIsInvoiceModalOpen(false)}
                  className="p-1 rounded-full bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Contenido Visual */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-6 pb-6">
                <div className="bg-white text-zinc-950 p-6 rounded-xl space-y-6 shadow-md border border-zinc-200">
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
                      <span className="text-md font-black text-blue-600 block">{createdInvoice.numero_factura}</span>
                      <span className="text-[9px] text-zinc-500 block mt-1">Fecha: {new Date(createdInvoice.fecha_emision).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="bg-zinc-50 p-3 rounded-lg flex flex-col space-y-1">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Pagar A:</span>
                    <span className="text-xs font-bold text-zinc-900">{activeProviderName}</span>
                  </div>

                  <div className="space-y-2">
                    <div className="grid grid-cols-12 text-[10px] font-black uppercase text-zinc-400 border-b border-zinc-200 pb-1 px-1">
                      <span className="col-span-6">Concepto</span>
                      <span className="col-span-2 text-right">Cant</span>
                      <span className="col-span-2 text-right">P. Unit</span>
                      <span className="col-span-2 text-right">Total</span>
                    </div>

                    <div className="divide-y divide-zinc-100 px-1">
                      {createdInvoice.items.map((it: any, idx: number) => (
                        <div key={idx} className="grid grid-cols-12 py-2 text-xs text-zinc-800">
                          <span className="col-span-6">{it.descripcion}</span>
                          <span className="col-span-2 text-right">{it.cantidad}</span>
                          <span className="col-span-2 text-right">{formatCOP(Number(it.precio_unitario))}</span>
                          <span className="col-span-2 text-right font-semibold">{formatCOP(Number(it.total))}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-zinc-250 pt-4 flex flex-col items-end space-y-1.5">
                    <div className="flex justify-between w-48 text-xs text-zinc-500">
                      <span>Subtotal:</span>
                      <span className="font-semibold">{formatCOP(Number(createdInvoice.subtotal))}</span>
                    </div>
                    <div className="flex justify-between w-48 text-sm font-black text-zinc-900 bg-zinc-100 p-2 rounded-lg">
                      <span>TOTAL LIQUIDACIÓN:</span>
                      <span>{formatCOP(Number(createdInvoice.total))}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botones */}
              <div className="flex flex-col gap-2.5 border-t border-zinc-850 pt-4 mt-auto">
                <div className="flex gap-2">
                  <button
                    onClick={() => printBluetoothESCPOSTicket(createdInvoice)}
                    disabled={isPrintingBt}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 text-xs shadow-lg shadow-indigo-600/10"
                  >
                    <Bluetooth size={15} className={isPrintingBt ? 'animate-pulse' : ''} />
                    {isPrintingBt ? 'Conectando e Imprimiendo...' : 'Imprimir Ticket (Bluetooth)'}
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={printThermalTicket}
                    className="flex-1 bg-zinc-850 hover:bg-zinc-800 text-zinc-200 font-semibold py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 text-xs"
                  >
                    <Printer size={15} />
                    Imprimir (PC/Celular)
                  </button>
                  <button
                    onClick={() => exportToPDF(createdInvoice)}
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
      </div>

      {/* COPIA TÉRMICA DE IMPRESIÓN */}
      <div className="print-area hidden">
        <div style={{ fontFamily: 'Courier New, Courier, monospace', fontSize: '11px', color: '#000000', lineHeight: '1.2' }}>
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 'bold', display: 'block' }}>{profile?.nombre_negocio || 'Mi Negocio'}</span>
            {profile?.nit && <span style={{ display: 'block' }}>NIT: {profile.nit}</span>}
            {profile?.telefono && <span style={{ display: 'block' }}>Tel: {profile.telefono}</span>}
            <span>================================</span>
          </div>

          <div style={{ marginBottom: '8px' }}>
            {createdInvoice && (
              <>
                <span style={{ fontWeight: 'bold' }}>LIQUIDACIÓN: {createdInvoice.numero_factura}</span><br />
                <span>FECHA: {new Date(createdInvoice.fecha_emision).toLocaleString()}</span><br />
                <span>ESTADO: {createdInvoice.estado.toUpperCase() === 'PAGADO' ? 'LIQUIDADA' : 'PENDIENTE'}</span>
              </>
            )}
            <br />
            <span>================================</span>
          </div>

          <div style={{ marginBottom: '8px' }}>
            <span style={{ fontWeight: 'bold' }}>PROVEEDOR:</span> {activeProviderName}<br />
            <span>================================</span>
          </div>

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
                {createdInvoice && createdInvoice.items.map((it: any, idx: number) => (
                  <tr key={idx}>
                    <td style={{ padding: '3px 0' }}>{it.descripcion}</td>
                    <td style={{ textAlign: 'right', padding: '3px 0' }}>{it.cantidad}</td>
                    <td style={{ textAlign: 'right', padding: '3px 0', whiteSpace: 'nowrap' }}>{formatCOP(Number(it.total))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <span>================================</span>
          </div>

          {createdInvoice && (
            <div style={{ textAlign: 'right', marginBottom: '12px' }}>
              <span>SUBTOTAL: {formatCOP(Number(createdInvoice.subtotal))}</span><br />
              <span style={{ fontWeight: 'bold', fontSize: '12px' }}>TOTAL COMPRA: {formatCOP(Number(createdInvoice.total))}</span>
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: '15px' }}>
            <span>================================</span><br />
            <span style={{ fontWeight: 'bold' }}>¡LIQUIDACIÓN REGISTRADA CON ÉXITO!</span><br />
            <span>SOPORTE DE ENTREGAS Y PAGOS</span>
          </div>
        </div>
      </div>

    </div>
  );
}
