import { PrintDesigner } from "../components/PrintDesigner";

export default function DesignerPage() {
  return (
    <main className="page">
      <header className="topbar">
        <a className="logo" href="/">YOURPRINT<span>.</span></a>
        <a className="topbar-note account-nav" href="/">← В ГЛАВНОЕ МЕНЮ</a>
      </header>
      <PrintDesigner />
    </main>
  );
}
