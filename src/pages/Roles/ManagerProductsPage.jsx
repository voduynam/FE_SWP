import { useEffect, useMemo, useState } from 'react';
import { workflowService } from '../../services/workflowService';

const itemTypeLabel = type => {
  if (type === 'RAW') return 'Nguyên liệu';
  if (type === 'FINISHED') return 'Thành phẩm';
  return type || '-';
};

const formatDate = value => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('vi-VN');
};

const getRecipeTitle = recipe => {
  if (!recipe) return 'Recipe';
  const itemName =
    recipe.item_id?.name ||
    recipe.item_id?.sku ||
    (typeof recipe.item_id === 'string' ? recipe.item_id : null);
  return itemName || recipe._id || 'Recipe';
};

export default function ManagerProductsPage() {
  const [items, setItems] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');

  const loadData = async () => {
    setError('');
    const [itemsRes, recipeRes, categoryRes] = await Promise.all([
      workflowService.getItems({ limit: 200 }),
      workflowService.getRecipes({ limit: 200 }),
      workflowService.getCategories({}),
    ]);

    const itemRows = Array.isArray(itemsRes.data?.data)
      ? itemsRes.data.data
      : Array.isArray(itemsRes.data)
        ? itemsRes.data
        : [];
    const recipeRows = Array.isArray(recipeRes.data?.data)
      ? recipeRes.data.data
      : Array.isArray(recipeRes.data)
        ? recipeRes.data
        : [];

    const categoryRows = Array.isArray(categoryRes.data?.data)
      ? categoryRes.data.data
      : Array.isArray(categoryRes.data)
        ? categoryRes.data
        : [];

    if (!itemsRes.success || !recipeRes.success || !categoryRes.success) {
      setError('Một phần dữ liệu items/recipes/categories chưa tải được.');
    }

    setItems(itemsRes.success ? itemRows : []);
    setRecipes(recipeRes.success ? recipeRows : []);
    setCategories(categoryRes.success ? categoryRows : []);
  };

  useEffect(() => {
    loadData();
  }, []);

  const categoryNameById = useMemo(() => {
    return categories.reduce((acc, cat) => {
      acc[cat._id] = cat.name || cat._id;
      return acc;
    }, {});
  }, [categories]);

  const categoryRows = useMemo(() => {
    return categories.map(cat => {
      const linkedItems = items.filter(item => {
        const itemCategoryId =
          typeof item.category_id === 'object' ? item.category_id?._id : item.category_id;
        return itemCategoryId === cat._id;
      });
      return {
        ...cat,
        item_count: linkedItems.length,
        item_names: linkedItems.map(it => it.name || it.sku || it._id),
      };
    });
  }, [categories, items]);

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold'>Sản phẩm & công thức</h1>
          <p className='text-gray-600'>
            Dữ liệu hiển thị theo schema MongoDB thật (`item`, `recipe`, `category`).
          </p>
        </div>
        <button onClick={loadData} className='rounded-md bg-black px-3 py-2 text-sm text-white'>
          Làm mới
        </button>
      </div>

      {error && <p className='text-sm text-red-600'>{error}</p>}

      <div className='grid gap-4 md:grid-cols-2'>
        <div className='overflow-hidden rounded-lg border bg-white'>
          <div className='border-b px-4 py-3 text-sm font-semibold'>Items (theo DB)</div>
          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead className='bg-gray-50 text-left text-xs uppercase text-gray-500'>
                <tr>
                  <th className='px-4 py-3'>Tên</th>
                  <th className='px-4 py-3'>SKU</th>
                  <th className='px-4 py-3'>Loại</th>
                  <th className='px-4 py-3'>Category</th>
                  <th className='px-4 py-3'>Status</th>
                </tr>
              </thead>
              <tbody className='divide-y'>
                {!items.length && (
                  <tr>
                    <td colSpan={5} className='px-4 py-6 text-center text-gray-500'>
                      Không có dữ liệu
                    </td>
                  </tr>
                )}
                {items.map(item => {
                  const itemCategoryId =
                    typeof item.category_id === 'object' ? item.category_id?._id : item.category_id;
                  return (
                    <tr key={item._id || item.id}>
                      <td className='px-4 py-3 font-medium'>{item.name || item._id}</td>
                      <td className='px-4 py-3 text-gray-600'>{item.sku || '-'}</td>
                      <td className='px-4 py-3 text-gray-600'>{itemTypeLabel(item.item_type)}</td>
                      <td className='px-4 py-3 text-gray-600'>
                        {item.category_id?.name || categoryNameById[itemCategoryId] || itemCategoryId || '-'}
                      </td>
                      <td className='px-4 py-3 text-gray-600'>{item.status || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className='overflow-hidden rounded-lg border bg-white'>
          <div className='border-b px-4 py-3 text-sm font-semibold'>Categories (gắn với item)</div>
          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead className='bg-gray-50 text-left text-xs uppercase text-gray-500'>
                <tr>
                  <th className='px-4 py-3'>Category</th>
                  <th className='px-4 py-3'>ID</th>
                  <th className='px-4 py-3'>Số item</th>
                  <th className='px-4 py-3'>Danh sách item</th>
                </tr>
              </thead>
              <tbody className='divide-y'>
                {!categoryRows.length && (
                  <tr>
                    <td colSpan={4} className='px-4 py-6 text-center text-gray-500'>
                      Không có category
                    </td>
                  </tr>
                )}
                {categoryRows.map(cat => (
                  <tr key={cat._id}>
                    <td className='px-4 py-3 font-medium'>{cat.name || cat._id}</td>
                    <td className='px-4 py-3 text-gray-600'>{cat._id}</td>
                    <td className='px-4 py-3 text-gray-600'>{cat.item_count}</td>
                    <td className='px-4 py-3 text-gray-600'>
                      {cat.item_names.length ? cat.item_names.join(', ') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className='rounded-lg border bg-white'>
          <div className='border-b px-4 py-3 text-sm font-semibold'>Recipes</div>
          <div className='divide-y'>
            {!recipes.length && (
              <p className='px-4 py-6 text-sm text-gray-500'>Không có công thức</p>
            )}
            {recipes.map(recipe => (
              <div key={recipe._id || recipe.id} className='px-4 py-3 text-sm'>
                <div className='font-medium'>{getRecipeTitle(recipe)}</div>
                <div className='text-gray-500'>
                  Version: {recipe.version || '-'} | Trạng thái: {recipe.status || '-'} | Hiệu lực:{' '}
                  {formatDate(recipe.effective_from)}
                </div>
              </div>
            ))}
          </div>
      </div>
    </div>
  );
}

