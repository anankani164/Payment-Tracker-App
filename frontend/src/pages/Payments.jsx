import React from 'react';

export default function Payments() {
  // Example structure with Recorded By and Client columns
  return (
    <table>
      <thead>
        <tr>
          <th>Payment #</th>
          <th>Client</th>
          <th>Amount</th>
          <th>Recorded By</th>
        </tr>
      </thead>
      <tbody>
        {/* Map payments here */}
      </tbody>
    </table>
  );
}
