// src/pages/ViewPages.jsx
import React from 'react';
import ViewUpperBar from '../component/view-upperbar';
import CustomizedTables from '../component/view-table'; // 
import MarkingDifferenceChart from '../component/view-MarkingDifferenceChart';


const ViewPages = () => {
    const markingData = [
    { name: "Apple", "AI marked": 85, "Tutor marked": 78, difference: 7 },
    { name: "Banana", "AI marked": 92, "Tutor marked": 95, difference: -3 },
    { name: "Car", "AI marked": 76, "Tutor marked": 82, difference: -6 },
    { name: "Dog", "AI marked": 88, "Tutor marked": 85, difference: 3 },
    { name: "Egg", "AI marked": 95, "Tutor marked": 90, difference: 5 },
    { name: "Great", "AI marked": 81, "Tutor marked": 85, difference: -4 },
    { name: "Hero", "AI marked": 89, "Tutor marked": 87, difference: 2 },
    { name: "IT", "AI marked": 73, "Tutor marked": 70, difference: 3 },
  ];
  return (
    <div>
      {/* ViewUpperBar */}
      <ViewUpperBar />
      
      {/*mian */}
      <main style={{ padding: '20px' }}>
        <h1>The AI results was Completed</h1>
        <p></p>
        <section>
          <h2>Course :</h2>
        </section>
        <CustomizedTables />
        <MarkingDifferenceChart data={markingData} />
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