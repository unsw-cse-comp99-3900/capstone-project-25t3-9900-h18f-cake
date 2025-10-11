// src/pages/ViewPages.jsx
import React from 'react';
import ViewUpperBar from '../component/view-upperbar';

const ViewPages = () => {
  return (
    <div>
      {/* 使用 ViewUpperBar 组件 */}
      <ViewUpperBar />
      
      {/* 页面内容 */}
      <main style={{ padding: '20px' }}>
        <h1>欢迎来到 ViewPages</h1>
        <p>这是您的主页面内容</p>
        <section>
          <h2>主要内容区域</h2>
          <p>在这里添加您的页面内容...</p>
        </section>
      </main>
      
      <footer style={{ 
        backgroundColor: '#f5f5f5', 
        padding: '20px', 
        textAlign: 'center',
        marginTop: '20px'
      }}>
        <p>© {new Date().getFullYear()} ViewPages - 保留所有权利</p>
      </footer>
    </div>
  );
};

export default ViewPages;