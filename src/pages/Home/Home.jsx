const Home = () => {
  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='container mx-auto px-4 py-16'>
        <div className='text-center'>
          <h1 className='text-4xl font-bold text-gray-900 mb-4'>
            Welcome to SWP391
          </h1>
          <p className='text-xl text-gray-600 mb-8'>
            Base code đã được setup với Tailwind CSS
          </p>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mt-12'>
            <div className='bg-white p-6 rounded-lg shadow-md'>
              <h2 className='text-xl font-semibold mb-2'>Components</h2>
              <p className='text-gray-600'>
                Cấu trúc components đã được tạo sẵn
              </p>
            </div>
            <div className='bg-white p-6 rounded-lg shadow-md'>
              <h2 className='text-xl font-semibold mb-2'>Pages</h2>
              <p className='text-gray-600'>Cấu trúc pages đã được tạo sẵn</p>
            </div>
            <div className='bg-white p-6 rounded-lg shadow-md'>
              <h2 className='text-xl font-semibold mb-2'>Tailwind CSS</h2>
              <p className='text-gray-600'>
                Đã setup Tailwind CSS thay vì CSS thuần
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;

