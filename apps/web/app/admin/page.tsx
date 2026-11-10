import { AdminOrders } from "../components/AdminOrders";
import { AdminPromoCodes } from "../components/AdminPromoCodes";

export default function AdminPage() {
  return (
    <main className="admin-page">
      <header className="admin-header">
        <a className="logo" href="/">YOURPRINT<span>.</span></a>
        <span className="topbar-note">ADMIN PANEL</span>
      </header>
      <AdminOrders />
      <AdminPromoCodes />
    </main>
  );
}
