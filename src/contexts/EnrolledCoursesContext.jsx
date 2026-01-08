import { createContext, useState, useEffect, useContext } from 'react';
import axiosInstance from '../utils/axiosInstance';
import { AuthContext } from './AuthContext';

export const EnrolledCoursesContext = createContext();

export const EnrolledCoursesProvider = ({ children }) => {
  const {
    isAuthenticated,
    user,
    loading: authLoading,
  } = useContext(AuthContext);

  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 phút

  const fetchEnrolledCourses = async (force = false) => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setLoading(false);
      setEnrolledCourses([]);
      return;
    }

    const now = Date.now();
    if (!force && now - lastFetchTime < CACHE_DURATION) {
      return;
    }

    try {
      setLoading(true);
      const res = await axiosInstance.get('/course/user/enrolled-courses');
      setEnrolledCourses(
        Array.isArray(res.data) ? res.data.filter(Boolean) : []
      );
      setLastFetchTime(now);
    } catch (error) {
      console.error('Error fetching enrolled courses:', error);
      if (error.response?.status === 401) {
        setEnrolledCourses([]);
        localStorage.removeItem('accessToken');
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshEnrolledCourses = async () => {
    await fetchEnrolledCourses(true);
  };

  useEffect(() => {
    if (authLoading === false) {
      if (isAuthenticated && user?._id) {
        fetchEnrolledCourses(true);
      } else {
        setEnrolledCourses([]);
      }
    }
  }, [isAuthenticated, authLoading, user?._id]);

  return (
    <EnrolledCoursesContext.Provider
      value={{ enrolledCourses, loading, refreshEnrolledCourses }}
    >
      {children}
    </EnrolledCoursesContext.Provider>
  );
};

