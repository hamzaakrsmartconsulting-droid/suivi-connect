<template>
  <div class="auth-left">
    <div class="auth-left__brand">
      <div class="brand-logo">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M12 21C12 21 3 14.5 3 9a9 9 0 0 1 18 0c0 5.5-9 12-9 12z" fill="white" opacity=".3"/>
          <path d="M3 12h4l2-5 4 10 2-5h6" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <span class="brand-name">SuiviConnect</span>
    </div>

    <div class="auth-left__headline">
      <h1>Suivi médical<br /><em>nouvelle génération</em></h1>
      <p>Suivi intelligent et personnalisé pour chaque patient. Votre santé, notre priorité.</p>
    </div>

    <div class="auth-left__deco" aria-hidden="true">
      <div class="deco-circle deco-circle--1" />
      <div class="deco-circle deco-circle--2" />
      <div class="deco-circle deco-circle--3" />
    </div>
  </div>
</template>

<style scoped>
.auth-left {
  background: linear-gradient(145deg, #0F172A 0%, #1E293B 50%, #0F1D36 100%);
  position: relative;
  overflow: hidden;
  padding: 40px 48px;
  display: flex;
  flex-direction: column;
}

.auth-left__brand {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 64px;
}

.brand-logo {
  width: 40px; height: 40px;
  background: linear-gradient(135deg, #2563EB, #1D4ED8);
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 16px rgba(37, 99, 235, 0.4);
  flex-shrink: 0;
}

.brand-name { font-size: 18px; font-weight: 800; color: #F8FAFC; letter-spacing: -0.03em; }

.auth-left__headline {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.auth-left__headline h1 {
  font-size: 40px;
  font-weight: 800;
  color: #F8FAFC;
  line-height: 1.15;
  letter-spacing: -0.04em;
  margin-bottom: 20px;
}
.auth-left__headline h1 em {
  font-style: normal;
  background: linear-gradient(90deg, #60A5FA, #34D399);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.auth-left__headline p {
  font-size: 15px;
  color: #94A3B8;
  line-height: 1.7;
  max-width: 360px;
}


.auth-left__deco { position: absolute; top: 0; right: 0; pointer-events: none; }
.deco-circle {
  position: absolute; border-radius: 50%;
  background: radial-gradient(circle, rgba(37,99,235,0.15), transparent);
}
.deco-circle--1 { width: 400px; height: 400px; top: -120px; right: -120px; }
.deco-circle--2 { width: 240px; height: 240px; top: 80px; right: -40px; background: radial-gradient(circle, rgba(16,185,129,0.08), transparent); }
.deco-circle--3 { width: 160px; height: 160px; top: 200px; right: 60px; background: radial-gradient(circle, rgba(99,102,241,0.1), transparent); }
</style>
