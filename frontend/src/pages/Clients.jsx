import React from "react";

export default function Clients() {
  return (
    <div className="container">
      <h1 className="page-title">Clients</h1>
      <div className="flex justify-center">
        <button className="bg-red-600 text-white rounded-full py-3 px-6 sm:px-8 shadow-sm w-auto max-w-xs">
          Add Client
        </button>
      </div>
      {/* ...rest of page... */}
    </div>
  );
}
