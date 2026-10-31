import React, { useState, useEffect, useCallback } from 'react';
import * as productApi from '../../api/product.api';
import { Table } from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Alert } from '../../components/common/Alert';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Plus, Search, Edit2, Layers, Tag, DollarSign, Package } from 'lucide-react';

export const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Create Product Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sku: '',
    salesPrice: 0,
    costPrice: 0,
    isActive: true,
  });

  // Variant Modal
  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [variantData, setVariantData] = useState({
    name: '',
    sku: '',
    price: 0,
    costPrice: 0,
    priceAdjustment: 0,
  });

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await productApi.getProducts({
        search,
        page: pagination.page,
        limit: pagination.limit,
      });

      if (res?.data) {
        setProducts(res.data.products || []);
        if (res.data.meta) {
          setPagination((prev) => ({
            ...prev,
            total: res.data.meta.total,
            totalPages: res.data.meta.totalPages,
          }));
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch products catalogue.');
    } finally {
      setLoading(false);
    }
  }, [search, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setError('');

    try {
      await productApi.createProduct({
        ...formData,
        salesPrice: Number(formData.salesPrice),
        costPrice: Number(formData.costPrice),
      });
      setSuccess('Product registered in catalog.');
      setIsModalOpen(false);
      fetchProducts();
    } catch (err) {
      setError(err.message || 'Failed to create product.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleOpenAddVariant = (product) => {
    setSelectedProduct(product);
    setVariantData({
      name: '',
      sku: `${product.sku || 'SKU'}-VAR-${Date.now().toString().slice(-4)}`,
      price: Number(product.salesPrice),
      costPrice: Number(product.costPrice),
      priceAdjustment: 0,
    });
    setVariantModalOpen(true);
  };

  const handleCreateVariant = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setError('');

    try {
      await productApi.addProductVariant(selectedProduct.id, {
        ...variantData,
        price: Number(variantData.price),
        costPrice: Number(variantData.costPrice),
        priceAdjustment: Number(variantData.priceAdjustment),
      });
      setSuccess(`Variant added to ${selectedProduct.name}.`);
      setVariantModalOpen(false);
      fetchProducts();
    } catch (err) {
      setError(err.message || 'Failed to add variant.');
    } finally {
      setModalLoading(false);
    }
  };

  const columns = [
    {
      header: 'Product Name / SKU',
      key: 'name',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-900">{row.name}</span>
          <span className="text-xs text-slate-500 font-mono">SKU: {row.sku || 'N/A'}</span>
          {row.description && <span className="text-xs text-slate-400 truncate max-w-xs">{row.description}</span>}
        </div>
      ),
    },
    {
      header: 'Base Sales Price',
      key: 'salesPrice',
      render: (row) => <span className="font-semibold text-slate-900">{formatCurrency(row.salesPrice)}</span>,
    },
    {
      header: 'Cost Price',
      key: 'costPrice',
      render: (row) => <span className="text-xs text-slate-500">{formatCurrency(row.costPrice)}</span>,
    },
    {
      header: 'Active Variants',
      key: 'variants',
      render: (row) => (
        <div className="flex flex-col gap-1">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700">
            <Layers className="w-3.5 h-3.5 text-blue-500" />
            {row.variants?.length || 0} variant(s)
          </span>
          {row.variants && row.variants.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-0.5">
              {row.variants.slice(0, 2).map((v) => (
                <span key={v.id} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                  {v.name} ({formatCurrency(v.price)})
                </span>
              ))}
              {row.variants.length > 2 && (
                <span className="text-[10px] text-slate-400">+{row.variants.length - 2} more</span>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Status',
      key: 'isActive',
      render: (row) => <Badge status={row.isActive ? 'ACTIVE' : 'INACTIVE'} />,
    },
    {
      header: 'Actions',
      key: 'actions',
      className: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenAddVariant(row)}
            title="Add Variant"
            className="text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            Variant
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Products & Catalog</h1>
          <p className="text-xs text-slate-500 mt-1">
            Software products, SKU configurations, and variant tier pricing (e.g. Odoo brand +$560 adjustment).
          </p>
        </div>

        <Button variant="primary" size="sm" icon={Plus} onClick={() => setIsModalOpen(true)}>
          New Product
        </Button>
      </div>

      {error && <Alert type="error" message={error} onDismiss={() => setError('')} />}
      {success && <Alert type="success" message={success} onDismiss={() => setSuccess('')} />}

      <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
        <div className="w-full sm:w-80">
          <Input
            placeholder="Search products by title or SKU..."
            icon={Search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Table
        columns={columns}
        data={products}
        loading={loading}
        pagination={pagination}
        onPageChange={(page) => setPagination((p) => ({ ...p, page }))}
        emptyMessage="No software products found."
      />

      {/* Create Product Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Software Product"
        description="Define base catalog item and pricing."
      >
        <form onSubmit={handleCreateProduct} className="space-y-4">
          <Input
            label="Product Name"
            name="name"
            required
            placeholder="e.g. Cloud ERP Suite"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <Input
            label="Product Description"
            name="description"
            placeholder="High-performance business software package"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="SKU Code"
              name="sku"
              placeholder="ERP-BASE-01"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
            />
            <Input
              label="Sales Price ($)"
              name="salesPrice"
              type="number"
              step="0.01"
              required
              value={formData.salesPrice}
              onChange={(e) => setFormData({ ...formData, salesPrice: e.target.value })}
            />
            <Input
              label="Cost Price ($)"
              name="costPrice"
              type="number"
              step="0.01"
              value={formData.costPrice}
              onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={modalLoading}>
              Save Product
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Variant Modal */}
      <Modal
        isOpen={variantModalOpen}
        onClose={() => setVariantModalOpen(false)}
        title={`Add Variant to ${selectedProduct?.name}`}
        description="Configure brand variants or edition tiers (e.g., Odoo Brand +$560)."
      >
        <form onSubmit={handleCreateVariant} className="space-y-4">
          <Input
            label="Variant Name"
            name="name"
            required
            placeholder="e.g. Odoo Brand Edition"
            value={variantData.name}
            onChange={(e) => setVariantData({ ...variantData, name: e.target.value })}
          />

          <Input
            label="Variant SKU"
            name="sku"
            required
            value={variantData.sku}
            onChange={(e) => setVariantData({ ...variantData, sku: e.target.value })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Effective Price ($)"
              name="price"
              type="number"
              step="0.01"
              required
              value={variantData.price}
              onChange={(e) => setVariantData({ ...variantData, price: e.target.value })}
            />
            <Input
              label="Price Delta / Adjustment ($)"
              name="priceAdjustment"
              type="number"
              step="0.01"
              placeholder="+560.00"
              value={variantData.priceAdjustment}
              onChange={(e) => setVariantData({ ...variantData, priceAdjustment: e.target.value })}
            />
            <Input
              label="Cost Price ($)"
              name="costPrice"
              type="number"
              step="0.01"
              value={variantData.costPrice}
              onChange={(e) => setVariantData({ ...variantData, costPrice: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setVariantModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={modalLoading}>
              Add Variant
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
