import React from 'react';

export default function Invoices() {
  // Example structure with Recorded By column
  return (
    <table>
      <thead>
        <tr>
          <th>Invoice #</th>
          <th>Client</th>
          <th>Amount</th>
          <th>Recorded By</th>
        </tr>
      </thead>
      <tbody>
        {/* Map invoices here */}
      </tbody>
    </table>
  );
}
