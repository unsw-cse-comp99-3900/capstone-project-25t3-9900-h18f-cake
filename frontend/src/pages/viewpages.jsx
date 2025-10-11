// src/pages/ViewPages.jsx
import React from 'react';
import ViewUpperBar from '../component/view-upperbar';
import CustomizedTables from '../component/view-table'; // 



const ViewPages = () => {
    
  return (
    <div>
      {/* ViewUpperBar */}
      <ViewUpperBar />
      
      {/*mian */}
      <main style={{ padding: '20px' }}>
        <h1>Welcome to ViewPages</h1>
        <p></p>
        <section>
          <h2>Course :</h2>
        </section>
        <CustomizedTables />
      </main>
      
      <footer style={{ 
        backgroundColor: '#f5f5f5', 
        padding: '20px', 
        textAlign: 'center',
        marginTop: '20px'
      }}>
      </footer>
    </div>
  );
};

export default ViewPages;