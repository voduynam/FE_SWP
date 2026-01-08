// src/store/actions/userActions.js
import axiosInstance from '../../utils/axiosInstance';

// Action Types
export const GET_USER_PROFILE_REQUEST = 'GET_USER_PROFILE_REQUEST';
export const GET_USER_PROFILE_SUCCESS = 'GET_USER_PROFILE_SUCCESS';
export const GET_USER_PROFILE_FAILURE = 'GET_USER_PROFILE_FAILURE';

export const UPDATE_USER_PROFILE_REQUEST = 'UPDATE_USER_PROFILE_REQUEST';
export const UPDATE_USER_PROFILE_SUCCESS = 'UPDATE_USER_PROFILE_SUCCESS';
export const UPDATE_USER_PROFILE_FAILURE = 'UPDATE_USER_PROFILE_FAILURE';

export const UPLOAD_AVATAR_REQUEST = 'UPLOAD_AVATAR_REQUEST';
export const UPLOAD_AVATAR_SUCCESS = 'UPLOAD_AVATAR_SUCCESS';
export const UPLOAD_AVATAR_FAILURE = 'UPLOAD_AVATAR_FAILURE';

export const RESET_UPDATE_SUCCESS = 'RESET_UPDATE_SUCCESS';
export const RESET_AVATAR_SUCCESS = 'RESET_AVATAR_SUCCESS';

export const CHANGE_PASSWORD_REQUEST = 'CHANGE_PASSWORD_REQUEST';
export const CHANGE_PASSWORD_SUCCESS = 'CHANGE_PASSWORD_SUCCESS';
export const CHANGE_PASSWORD_FAILURE = 'CHANGE_PASSWORD_FAILURE';

export const changePassword =
  (currentPassword, newPassword) => async dispatch => {
    dispatch({ type: CHANGE_PASSWORD_REQUEST });
    try {
      await axiosInstance.patch('/user/change-password', {
        currentPassword,
        newPassword,
      });
      dispatch({ type: CHANGE_PASSWORD_SUCCESS });
    } catch (err) {
      dispatch({
        type: CHANGE_PASSWORD_FAILURE,
        payload: err.response?.data?.message || 'Đổi mật khẩu thất bại',
      });
    }
  };
export const resetChangePasswordStatus = () => ({
  type: 'RESET_CHANGE_PASSWORD_STATUS',
});

// Get profile
export const getUserProfile = () => async dispatch => {
  dispatch({ type: GET_USER_PROFILE_REQUEST });
  try {
    const res = await axiosInstance.get('/user/profile');
    dispatch({ type: GET_USER_PROFILE_SUCCESS, payload: res.data });
  } catch (err) {
    dispatch({
      type: GET_USER_PROFILE_FAILURE,
      payload:
        err?.response?.data?.message || err.message || 'Lỗi lấy thông tin user',
    });
  }
};

// Update profile (chỉ gửi field cho phép update)
export const updateUserProfile = userData => async dispatch => {
  dispatch({ type: UPDATE_USER_PROFILE_REQUEST });
  try {
    const updatePayload = {
      name: userData.name,
      gender: userData.gender,
      dateOfBirth: userData.dateOfBirth,
    };
    await axiosInstance.put('/user/profile', updatePayload);

    // Update xong gọi lại getUserProfile để lấy dữ liệu user mới nhất
    const res = await axiosInstance.get('/user/profile');
    dispatch({ type: UPDATE_USER_PROFILE_SUCCESS, payload: res.data });
  } catch (err) {
    dispatch({
      type: UPDATE_USER_PROFILE_FAILURE,
      payload:
        err?.response?.data?.message || err.message || 'Lỗi cập nhật user',
    });
  }
};

// Helper chuyển file sang base64
const fileToBase64 = file =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });

export const uploadAvatar = file => async dispatch => {
  dispatch({ type: UPLOAD_AVATAR_REQUEST });
  try {
    const base64 = await fileToBase64(file);
    await axiosInstance.put('/user/avatar', { avatar: base64 });

    // GỌI LẠI GET PROFILE ĐỂ GIỮ LUÔN ĐỦ FIELD CHO user
    const res = await axiosInstance.get('/user/profile');
    dispatch({ type: UPLOAD_AVATAR_SUCCESS, payload: res.data });
  } catch (err) {
    dispatch({
      type: UPLOAD_AVATAR_FAILURE,
      payload:
        err?.response?.data?.message || err.message || 'Lỗi upload avatar',
    });
  }
};

// Reset success
export const resetUpdateSuccess = () => ({ type: RESET_UPDATE_SUCCESS });
export const resetAvatarSuccess = () => ({ type: RESET_AVATAR_SUCCESS });

