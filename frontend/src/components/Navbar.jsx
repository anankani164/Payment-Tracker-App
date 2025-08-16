import { NavLink } from "react-router-dom";

export default function Navbar() {
  return (
    <ul className="flex items-center flex-wrap gap-2 sm:gap-4 md:gap-6 lg:gap-8">
      <li><NavLink to="/dashboard" className="px-3 py-2 rounded-full">Dashboard</NavLink></li>
      <li><NavLink to="/clients" className="px-3 py-2 rounded-full">Clients</NavLink></li>
      <li><NavLink to="/invoices" className="px-3 py-2 rounded-full">Invoices</NavLink></li>
      <li><NavLink to="/payments" className="px-3 py-2 rounded-full">Payments</NavLink></li>
      <li><NavLink to="/admin" className="px-3 py-2 rounded-full">Admin</NavLink></li>
    </ul>
  );
}
