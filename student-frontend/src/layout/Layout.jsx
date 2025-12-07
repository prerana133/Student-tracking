import React from 'react';
import PropTypes from 'prop-types';
import SideNav from '../components/SideNav';
import styles from './Layout.module.css';


const Layout = ({ children }) => (
  <div className={styles.appLayout}>
    <aside className={styles.sideNav}>
      <SideNav />
    </aside>
    <main className={styles.mainContent}>
      {children}
    </main>
  </div>
);

Layout.propTypes = {
  children: PropTypes.node.isRequired,
};

export default Layout;
