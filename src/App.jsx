/* eslint-disable no-unused-vars */
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { EnrolledCoursesProvider } from './contexts/EnrolledCoursesContext';
import { Provider } from 'react-redux';
import store from './store';
import ScrollToTop from './components/ScrollToTop';
import RoleProtectedRoute from './components/RoleProtectedRoute';
import Layout from './components/Layout/Layout';
import Home from './pages/Home/Home';
import Login from './pages/Auth/Login';
import NotFound from './pages/NotFound/NotFound';


function AppContent() {
  return (
    <Routes>
      <Route path='/' element={<Layout />}>
        <Route index element={<Home />} />
        {/* TODO: Thêm các routes khác từ frontend/src/App.jsx */}
        {/* 
        <Route path='courses' element={<CourseListPage />} />
        <Route path='courses/:id' element={<CourseLessonPage />} />
        <Route path='blog' element={<Blog />} />
        ... các routes khác
        */}
      </Route>

      <Route path='/login' element={<Login />} />
      {/* TODO: Thêm các auth routes khác */}
      {/* <Route path='/register' element={<Register />} /> */}
      <Route path='*' element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <Provider store={store}>
      <Router>
        <ScrollToTop />
        <AuthProvider>
          <EnrolledCoursesProvider>
            <AppContent />
          </EnrolledCoursesProvider>
        </AuthProvider>
      </Router>
    </Provider>
  );
}

export default App;
