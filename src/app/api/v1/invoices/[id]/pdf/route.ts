import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { authenticateRequest, isAuthError } from '@/lib/apiAuth';
import { apiNotFound, apiServerError } from '@/lib/apiResponse';
import { jsPDF } from 'jspdf';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const formatCOP = (val: number) => {
  const formattedVal = Math.abs(val).toLocaleString('es-CO', { minimumFractionDigits: 0 });
  if (val < 0) return `- $ ${formattedVal}`;
  return `$ ${formattedVal}`;
};

/**
 * GET /api/v1/invoices/:id/pdf
 * Genera y descarga un PDF de la factura/liquidación.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(request);
    if (isAuthError(auth)) return auth;

    const { id } = await params;

    // Obtener factura
    const { data: invoice } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .eq('id', id)
      .eq('negocio_id', auth.negocioId)
      .single();

    if (!invoice) return apiNotFound('Factura');

    // Obtener items
    const { data: items } = await supabaseAdmin
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', id);

    // Obtener datos del proveedor
    const { data: client } = await supabaseAdmin
      .from('clients')
      .select('nombre, telefono, direccion')
      .eq('id', invoice.cliente_id)
      .single();

    // Obtener perfil del negocio
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('nombre_negocio, nombre_propietario, direccion, telefono, nit, logo_url')
      .eq('id', auth.negocioId)
      .single();

    // --- Generar PDF ---
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });

    const primaryColor: [number, number, number] = [30, 41, 59];
    const accentColor: [number, number, number] = [37, 99, 235];
    const textColor: [number, number, number] = [51, 65, 85];
    const grayLight: [number, number, number] = [248, 250, 252];
    const borderColor: [number, number, number] = [226, 232, 240];

    // Header del negocio
    doc.setTextColor(...primaryColor);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(22);
    doc.text(profile?.nombre_negocio || 'Mi Negocio', 15, 22);

    doc.setTextColor(100, 116, 139);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`NIT: ${profile?.nit || 'CF'}`, 15, 28);
    doc.text(`Tel: ${profile?.telefono || 'N/A'}`, 15, 33);
    doc.text(`Dirección: ${profile?.direccion || 'N/A'}`, 15, 38);

    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.4);
    doc.line(15, 45, 195, 45);

    // Datos del proveedor
    doc.setFillColor(...grayLight);
    doc.roundedRect(15, 52, 100, 28, 2, 2, 'F');

    doc.setTextColor(...primaryColor);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('PAGAR A (PROVEEDOR):', 20, 58);

    doc.setTextColor(...textColor);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(client?.nombre || 'Proveedor', 20, 64);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Teléfono: ${client?.telefono || 'N/A'}`, 20, 69);
    doc.text(`Dirección: ${client?.direccion || 'N/A'}`, 20, 74);

    // Datos de la factura
    doc.setFillColor(...grayLight);
    doc.roundedRect(125, 52, 70, 28, 2, 2, 'F');

    doc.setTextColor(...accentColor);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('LIQUIDACIÓN DE COMPRA', 130, 58);

    doc.setTextColor(...primaryColor);
    doc.setFontSize(10);
    doc.text(`N°: ${invoice.numero_factura}`, 130, 64);

    doc.setTextColor(...textColor);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`Fecha: ${new Date(invoice.fecha_emision).toLocaleDateString()}`, 130, 69);

    const isPaid = invoice.estado === 'pagado';
    doc.setTextColor(isPaid ? 16 : 217, isPaid ? 124 : 119, isPaid ? 65 : 6);
    doc.setFont('Helvetica', 'bold');
    doc.text(`Estado: ${isPaid ? 'LIQUIDADA' : 'PENDIENTE'}`, 130, 74);

    // Tabla de items
    let y = 92;
    doc.setFillColor(...primaryColor);
    doc.roundedRect(15, y - 5, 180, 8, 1, 1, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('Descripción', 18, y);
    doc.text('Cant.', 125, y, { align: 'right' });
    doc.text('Precio U.', 155, y, { align: 'right' });
    doc.text('Total', 190, y, { align: 'right' });

    doc.setTextColor(...textColor);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    y += 8;

    for (const [index, item] of (items || []).entries()) {
      const descLines = doc.splitTextToSize(item.descripcion, 100);
      const rowHeight = Math.max(7.5, descLines.length * 4 + 2);

      if (index % 2 === 0) {
        doc.setFillColor(...grayLight);
        doc.rect(15, y - 4, 180, rowHeight, 'F');
      }

      doc.setDrawColor(...borderColor);
      doc.setLineWidth(0.2);
      doc.line(15, y + rowHeight - 4, 195, y + rowHeight - 4);

      descLines.forEach((line: string, lineIndex: number) => {
        doc.text(line, 18, y + (lineIndex * 4));
      });

      doc.text(String(item.cantidad), 125, y, { align: 'right' });
      doc.text(formatCOP(item.precio_unitario), 155, y, { align: 'right' });
      doc.text(formatCOP(item.total), 190, y, { align: 'right' });

      y += rowHeight;

      if (y > 240) {
        doc.addPage();
        y = 25;
      }
    }

    // Totales
    y += 4;
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.line(125, y, 195, y);
    y += 6;

    doc.setTextColor(...textColor);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('TOTAL:', 130, y);
    doc.setFont('Helvetica', 'normal');
    doc.text(formatCOP(invoice.total), 190, y, { align: 'right' });

    const hasDebt = invoice.deuda_pendiente && Number(invoice.deuda_pendiente) > 0;
    if (hasDebt) {
      y += 7;
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
      doc.setFillColor(...accentColor);
      doc.roundedRect(125, y - 5, 70, 8, 1.5, 1.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.text('TOTAL NETO A PAGAR:', 130, y);
      doc.text(formatCOP(invoice.total), 190, y, { align: 'right' });
    }

    // Generar buffer del PDF
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    const nameSafe = (client?.nombre || 'factura').replace(/\s+/g, '_');
    const filename = `${invoice.numero_factura}_${nameSafe}.pdf`;

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    return apiServerError(err);
  }
}
