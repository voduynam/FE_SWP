const initialState = {
  loading: false,
  enrolling: false,
  data: null,
  error: null,
  enrolled: false,
};

export const courseEnrollReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'FETCH_COURSE_ENROLL_REQUEST':
      return {
        ...state,
        loading: true,
        error: null,
      };
    case 'FETCH_COURSE_ENROLL_SUCCESS':
      return {
        ...state,
        loading: false,
        data: action.payload,
        error: null,
      };
    case 'FETCH_COURSE_ENROLL_FAILURE':
      return {
        ...state,
        loading: false,
        error: action.payload,
      };
    default:
      return state;
  }
};

