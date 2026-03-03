import { useEffect, useState } from 'react';
import { workflowService } from '../../services/workflowService';

export default function ManagerProductsPage() {
  const [items, setItems] = useState([]);
  const [recipes, setRecipes] = useState([]);

  const loadData = async () => {
    const [itemsRes, recipeRes] = await Promise.all([
      workflowService.getItems({ limit: 20 }),
      workflowService.getRecipes({ limit: 20 }),
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

    setItems(itemRows);
    setRecipes(recipeRows);
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold'>Sản phẩm & công thức</h1>
          <p className='text-gray-600'>
            Flow áp dụng: quản lý `items` + `recipes` cho vai trò Manager.
          </p>
        </div>
        <button onClick={loadData} className='rounded-md bg-black px-3 py-2 text-sm text-white'>
          Làm mới
        </button>
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <div className='rounded-lg border bg-white'>
          <div className='border-b px-4 py-3 text-sm font-semibold'>Items</div>
          <div className='divide-y'>
            {!items.length && <p className='px-4 py-6 text-sm text-gray-500'>Không có dữ liệu</p>}
            {items.map(item => (
              <div key={item._id || item.id} className='px-4 py-3 text-sm'>
                <div className='font-medium'>{item.name || item.sku || item._id}</div>
                <div className='text-gray-500'>Loại: {item.item_type || '-'}</div>
              </div>
            ))}
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
                <div className='font-medium'>{recipe.name || recipe._id}</div>
                <div className='text-gray-500'>Trạng thái: {recipe.status || '-'}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

