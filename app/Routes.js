/* eslint flowtype-errors/show-errors: 0 */
import React from 'react';
import { Switch, Route } from 'react-router';
import routes from './constants/routes';
import App from './containers/App';
import UploadPage from './containers/UploadPage';

export default () => (
  <App>
    <Switch>
      <Route path={routes.UPLOAD} component={UploadPage} />
    </Switch>
  </App>
);
