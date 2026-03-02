import { useState } from 'react';
import { Search, Plus, Grid, List, Edit, Trash2, Package } from 'lucide-react';
import StatusBadge from '../../components/ui/StatusBadge';

const productsData = [
  { id: 'SP001', name: 'Cơm gà', category: 'Chính', unit: 'hộp', price: 45000, cost: 28500, stock: 150, status: 'in_stock', image: '🍱' },
  { id: 'SP002', name: 'Phở bò', category: 'Chính', unit: 'bát', price: 55000, cost: 35000, stock: 200, status: 'in_stock', image: '🍜' },
  { id: 'SP003', name: 'Bánh mì thịt', category: 'Bánh', unit: 'cái', price: 35000, cost: 18000, stock: 8, status: 'low_stock', image: '🥪' },
  { id: 'SP004', name: 'Chả giò', category: 'Khai vị', unit: 'phần', price: 25000, cost: 12000, stock: 0, status: 'out_of_stock', image: '🍤' },
  { id: 'SP005', name: 'Nem chua', category: 'Khai vị', unit: 'phần', price: 30000, cost: 15000, stock: 85, status: 'in_stock', image: '🥟' },
];

const categories = ['Tất cả', 'Chính', 'Bánh', 'Khai vị'];

export default function Products() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Tất cả');
  const [viewMode, setViewMode] = useState('grid');

  const filteredProducts = productsData.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'Tất cả' || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Quản lý Sản phẩm</h1>
          <p className="text-muted-foreground mt-1">
            Danh mục sản phẩm, công thức và định mức nguyên liệu
          </p>
        </div>
        <button className="btn-secondary flex items-center gap-2 w-fit">
          <Plus className="w-4 h-4" />
          Thêm sản phẩm
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Tìm kiếm sản phẩm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-11"
          />
        </div>
        <div className="flex gap-3">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input-field min-w-[150px]"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <div className="flex border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2.5 ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted'}`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2.5 ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted'}`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${
              categoryFilter === cat
                ? 'bg-secondary text-secondary-foreground font-medium'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Products Grid */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product) => (
            <div key={product.id} className="bg-card rounded-xl border border-border p-4 hover:shadow-lg transition-all hover:-translate-y-1">
              <div className="flex items-start justify-between mb-4">
                <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center text-4xl">
                  {product.image}
                </div>
                <StatusBadge status={product.status} />
              </div>
              <h3 className="font-semibold text-lg">{product.name}</h3>
              <p className="text-sm text-muted-foreground">{product.category}</p>
              
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Giá bán:</span>
                  <span className="font-semibold">{product.price.toLocaleString('vi-VN')}₫</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Giá vốn:</span>
                  <span>{product.cost.toLocaleString('vi-VN')}₫</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tồn kho:</span>
                  <span className={product.stock === 0 ? 'text-destructive' : product.stock < 20 ? 'text-warning' : ''}>
                    {product.stock} {product.unit}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-border flex gap-2">
                <button className="flex-1 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-sm font-medium flex items-center justify-center gap-1">
                  <Edit className="w-4 h-4" />
                  Sửa
                </button>
                <button className="py-2 px-3 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead className="table-header">
              <tr>
                <th className="px-6 py-4 text-left">Sản phẩm</th>
                <th className="px-6 py-4 text-left">Danh mục</th>
                <th className="px-6 py-4 text-left">Đơn vị</th>
                <th className="px-6 py-4 text-right">Giá bán</th>
                <th className="px-6 py-4 text-right">Giá vốn</th>
                <th className="px-6 py-4 text-right">Tồn kho</th>
                <th className="px-6 py-4 text-center">Trạng thái</th>
                <th className="px-6 py-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-muted/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{product.image}</span>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">{product.category}</td>
                  <td className="px-6 py-4">{product.unit}</td>
                  <td className="px-6 py-4 text-right font-semibold">{product.price.toLocaleString('vi-VN')}₫</td>
                  <td className="px-6 py-4 text-right">{product.cost.toLocaleString('vi-VN')}₫</td>
                  <td className="px-6 py-4 text-right">{product.stock}</td>
                  <td className="px-6 py-4 text-center"><StatusBadge status={product.status} /></td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button className="p-2 rounded-lg hover:bg-muted">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-2 rounded-lg hover:bg-destructive/10 text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>Hiển thị {filteredProducts.length} / {productsData.length} sản phẩm</p>
      </div>
    </div>
  );
}
