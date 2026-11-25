import React, { useRef, useState } from "react";
import { Boxes, Layers3, Store, X } from "lucide-react";
import logo from "./assets/images/total-solution-mark.png";
import "./LandingPage.css";

function LoginPanel({ Login, onClose, onLoginSuccess }) {
  return (
    <aside className="landing-auth-panel" id="landing-login-panel" aria-label="Login or register">
      <button type="button" className="landing-dialog-close" aria-label="Close login" onClick={onClose} autoFocus><X size={20} /></button>
      <Login onLoginSuccess={onLoginSuccess} />
    </aside>
  );
}

export default function LandingPage({ Login, onLoginSuccess }) {
  const [showLogin, setShowLogin] = useState(false);
  const [product, setProduct] = useState("ERP");
  const loginButtonRef = useRef(null);

  return (
    <main className="landing-page">
      <div className={`landing-hero ${showLogin ? "landing-hero-with-login" : ""}`} id="product">
        <div className="landing-snow" aria-hidden="true">
          {Array.from({ length: 24 }, (_, index) => <span key={index} style={{ "--snow-x": `${(index * 37 + 9) % 100}%`, "--snow-delay": `${-(index % 12)}s`, "--snow-duration": `${10 + (index % 7) * 2}s`, "--snow-size": `${3 + (index % 3) * 2}px` }} />)}
        </div>
        <header className="landing-header">
          <a className="landing-brand" href="#product" aria-label="Total Solution ERP home"><img src={logo} alt="" /><span>Total Solution ERP</span></a>
          <nav className="landing-nav" aria-label="Main navigation">
            <a href="#product">Product</a><a href="#modules">Modules</a><a href="#solutions">Solutions</a><a href="#contact">Pricing</a><a href="#contact">Contact</a>
          </nav>
          <div className="landing-header-actions"><a className="landing-talk" href="#contact">Talk to us</a><button ref={loginButtonRef} type="button" className="landing-login" aria-expanded={showLogin} aria-controls="landing-login-panel" onClick={() => setShowLogin((current) => !current)}>Login / Register</button></div>
        </header>
        <div className="landing-content">
        <section className="landing-intro" id="solutions" aria-labelledby="landing-title">
          <div className="landing-eyebrow"><span /> Built for distribution businesses</div>
          <h1 id="landing-title">Run distribution the way<br className="landing-desktop-break" /> you planned it</h1>
          <p className="landing-description">Manage inventory, billing, sales and routes in one connected system built for fast-moving businesses.</p>
          <p className="landing-tagline"><span />We are not different, we think different<span /></p>
          <div className="landing-product-switch" id="modules" role="group" aria-label="Choose product">
            <button type="button" className={product === "ERP" ? "active" : ""} aria-pressed={product === "ERP"} onClick={() => setProduct("ERP")}><Layers3 size={19} /> ERP</button>
            <button type="button" className={product === "DMS" ? "active" : ""} aria-pressed={product === "DMS"} onClick={() => setProduct("DMS")}><Boxes size={19} /> DMS</button>
          </div>
          <a className="landing-product-summary" href="#contact"><span>{product === "ERP" ? "Inventory, billing, sales, reporting and control" : "Distribution, routes and sales operations"}</span><span className="landing-summary-action">Contact us</span></a>
          <p className="landing-audience"><Store size={19} /> Built for distributors, wholesalers and retailers</p>
        </section>
        {showLogin && <LoginPanel Login={Login} onClose={() => { setShowLogin(false); loginButtonRef.current?.focus(); }} onLoginSuccess={onLoginSuccess} />}
        </div>
        <footer className="landing-footer" id="contact">
          <strong>Total Solution ERP</strong>
          <a href="mailto:totalsolution2023@gmail.com">totalsolution2023@gmail.com</a>
          <a href="tel:+919850906140">+91 98509 06140</a>
          <a href="tel:+919657084117">+91 96570 84117</a>
          <a href="https://webstie.totalsolutionmerp.com">webstie.totalsolutionmerp.com</a>
        </footer>
      </div>
    </main>
  );
}
