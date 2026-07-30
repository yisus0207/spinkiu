'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Boxes, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  AlertCircle,
  Package,
  Layers,
  Infinity as InfinityIcon,
  ShoppingBag
} from 'lucide-react';

export default function InventoryPage() {
  const { 
    products, 
    fetchProducts, 
    addProduct, 
    updateProduct, 
    deleteProduct,
    isLoading 
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  // Form states
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [controlarStock, setControlarStock] = useState(false);
  const [stock, setStock] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const openCreateModal = () => {
    setEditingProduct(null);
    setCodigo('');
    setNombre('');
    setPrecio('');
    setControlarStock(false);
    setStock('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (prod: any) => {
    setEditingProduct(prod);
    setCodigo(prod.codigo || '');
    setNombre(prod.nombre);
    setPrecio(String(prod.precio));
    setControlarStock(prod.stock !== null);
    setStock(prod.stock !== null ? String(prod.stock) : '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!nombre.trim() || !precio) {
      setFormError('Por favor completa todos los campos obligatorios.');
      return;
    }

    const priceVal = parseFloat(precio);
    if (isNaN(priceVal) || priceVal < 0) {
      setFormError('El precio debe ser un número positivo.');
      return;
    }

    let stockVal: number | null = null;
    if (controlarStock) {
      const parsedStock = parseInt(stock);
      if (isNaN(parsedStock) || parsedStock < 0) {
        setFormError('El stock debe ser un número entero mayor o igual a 0.');
        return;
      }
      stockVal = parsedStock;
    }

    try {
      const prodPayload = {
        codigo,
        nombre,
        precio: priceVal,
        stock: stockVal,
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, prodPayload);
      } else {
        await addProduct(prodPayload);
      }
      closeModal();
    } catch (err: any) {
      setFormError(err.message || 'Error al guardar el producto.');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`¿Estás seguro de que deseas eliminar el producto/servicio "${name}"?`)) {
      try {
        await deleteProduct(id);
      } catch (err: any) {
        alert(err.message || 'Error al eliminar producto.');
      }
    }
  };

  const filteredProducts = products.filter(p => {
    const q = searchQuery.toLowerCase();
    return (
      p.nombre.toLowerCase().includes(q) ||
      (p.codigo && p.codigo.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full flex flex-col h-full space-y-4">
      {/* Cabecera */}
      <div className="flex justify-between items-center">
        <div>
          <span className="text-xs font-bold text-blue-500 uppercase tracking-widest">Catálogo</span>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-100 mt-0.5">Control de Inventario</h1>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all cursor-pointer shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 shrink-0"
        >
          <Plus size={16} />
          <span>Nuevo Producto</span>
        </button>
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
        <input
          type="text"
          placeholder="Buscar producto por nombre o código..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-12 pr-4 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
        />
      </div>

      {/* Lista de productos */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-6">
        {isLoading && products.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 space-y-3 animate-pulse h-32">
                <div className="h-4 bg-zinc-850 rounded-md w-2/3"></div>
                <div className="h-3 bg-zinc-850 rounded-md w-1/3"></div>
                <div className="h-8 bg-zinc-850 rounded-xl w-full mt-4"></div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12 bg-zinc-900/10 border border-zinc-800/40 rounded-2xl p-6">
            <Package className="mx-auto text-zinc-600 mb-3" size={32} />
            <p className="text-sm text-zinc-400 font-semibold">No hay productos en inventario</p>
            <p className="text-xs text-zinc-500 mt-1">Registra productos o servicios para cargarlos rápidamente a tus facturas.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AnimatePresence>
              {filteredProducts.map((p) => {
                const isService = p.stock === null;
                const isLowStock = p.stock !== null && p.stock < 3 && p.stock > 0;
                const isOutOfStock = p.stock !== null && p.stock === 0;

                return (
                  <motion.div
                    key={p.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="glass-card rounded-2xl p-4 flex flex-col justify-between border border-zinc-800/80"
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h3 className="font-bold text-base text-zinc-100 line-clamp-1">{p.nombre}</h3>
                          {p.codigo && (
                            <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block mt-0.5">SKU: {p.codigo}</span>
                          )}
                        </div>
                        <span className="text-sm font-extrabold text-blue-400 shrink-0">
                          $ {Number(p.precio).toLocaleString('es-CO', { minimumFractionDigits: 0 })}
                        </span>
                      </div>

                      {/* Stock Badge */}
                      <div className="flex items-center gap-1.5 pt-1">
                        {isService ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase px-2 py-0.5 bg-zinc-800 text-zinc-400 border border-zinc-700/60 rounded-md">
                            <InfinityIcon size={10} />
                            Servicio Ilimitado
                          </span>
                        ) : isOutOfStock ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase px-2 py-0.5 bg-red-950/20 text-red-400 border border-red-900/30 rounded-md">
                            Agotado
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase px-2 py-0.5 bg-amber-950/20 text-amber-400 border border-amber-900/30 rounded-md">
                            Stock Bajo: {p.stock} U
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase px-2 py-0.5 bg-emerald-950/20 text-emerald-400 border border-emerald-900/30 rounded-md">
                            Disponibles: {p.stock} U
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex gap-2 mt-4 pt-3 border-t border-zinc-900 items-center justify-end">
                      <button
                        onClick={() => openEditModal(p)}
                        className="p-2 rounded-lg bg-zinc-800/85 hover:bg-zinc-750 text-zinc-400 hover:text-zinc-200 cursor-pointer transition-colors"
                        title="Editar Producto"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id, p.nombre)}
                        className="p-2 rounded-lg bg-red-955/20 hover:bg-red-955/40 text-red-450 hover:text-red-400 cursor-pointer transition-colors"
                        title="Eliminar Producto"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* MODAL CREAR / EDITAR PRODUCTO */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-full md:max-w-md bg-zinc-900 border-t md:border border-zinc-800 rounded-t-3xl md:rounded-2xl p-6 shadow-2xl z-10 overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="flex justify-between items-center mb-4 border-b border-zinc-850 pb-3">
                <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                  <Boxes size={18} className="text-blue-400" />
                  {editingProduct ? 'Editar Ítem' : 'Añadir Producto / Servicio'}
                </h2>
                <button
                  onClick={closeModal}
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

              <form onSubmit={handleSave} className="space-y-4 overflow-y-auto flex-1 pr-1 pb-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Nombre del Item *</label>
                  <input
                    type="text"
                    placeholder="Ej. Router Cisco RV340"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-all"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Precio de Venta ($ COP) *</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={precio}
                      onChange={(e) => setPrecio(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Código / SKU / Código Barras</label>
                    <input
                      type="text"
                      placeholder="Ej. SKU-012"
                      value={codigo}
                      onChange={(e) => setCodigo(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                {/* Controlar Stock Switch */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setControlarStock(!controlarStock);
                      if (!controlarStock) setStock('0');
                    }}
                    className="flex items-center gap-3 text-left w-full py-2 px-1 text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer group"
                  >
                    <div className={`h-5 w-9 rounded-full transition-colors flex items-center p-0.5 ${controlarStock ? 'bg-blue-600' : 'bg-zinc-800 border border-zinc-700'}`}>
                      <div className={`h-4 w-4 rounded-full bg-white transition-transform ${controlarStock ? 'translate-x-4' : 'translate-x-0'}`}></div>
                    </div>
                    <span>¿Controlar cantidad en Inventario (Stock)?</span>
                  </button>
                </div>

                <AnimatePresence>
                  {controlarStock && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Cantidad / Stock Actual *</label>
                      <input
                        type="number"
                        placeholder="Ej. 10"
                        value={stock}
                        onChange={(e) => setStock(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-all"
                        required={controlarStock}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex gap-3 pt-4 border-t border-zinc-800/80">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 bg-zinc-855 hover:bg-zinc-800 text-zinc-300 font-semibold py-3 rounded-xl transition-all cursor-pointer text-center text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all cursor-pointer text-center text-sm shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
