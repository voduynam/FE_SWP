import { createStore, combineReducers, applyMiddleware, compose } from 'redux';
import { thunk } from 'redux-thunk';
import { courseEnrollReducer } from './reducers/courseEnrollReducer';
import { userReducer } from './reducers/userReducer';

const rootReducer = combineReducers({
  courseEnroll: courseEnrollReducer,
  user: userReducer,
});

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

const store = createStore(
  rootReducer,
  composeEnhancers(applyMiddleware(thunk))
);

export default store;

