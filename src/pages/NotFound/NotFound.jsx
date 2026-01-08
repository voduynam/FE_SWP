const NotFound = () => {
  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50'>
      <div className='text-center'>
        <h1 className='text-4xl font-bold text-gray-900 mb-4'>
          404 - Không Tìm Thấy Trang
        </h1>
        <p className='text-gray-600 mb-8'>
          Trang bạn đang tìm kiếm không tồn tại.
        </p>
        <a
          href='/'
          className='px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
        >
          Về trang chủ
        </a>
      </div>
    </div>
  );
};

export default NotFound;

