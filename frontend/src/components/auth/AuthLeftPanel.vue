<template>
  <aside class="auth-visual" aria-hidden="false">
    <div class="auth-visual__inner">
      <img src="/logo.png" alt="SuiviConnect" class="auth-visual__logo" />

      <div class="auth-visual__copy">
        <h1 class="auth-visual__title">
          Suivi médical<br />
          <span>médecin &amp; patient</span>
        </h1>
        <p class="auth-visual__sub">
          Alertes cliniques, messagerie sécurisée et suivi hebdomadaire pour la rééducation cardiaque.
        </p>
      </div>

      <p class="auth-visual__footer">Données protégées · Accès sécurisé</p>
    </div>
  </aside>
</template>

<style scoped>
.auth-visual {
  position: relative;
  overflow: hidden;
  min-height: 100vh;
  padding: 48px 56px;
  display: flex;
  align-items: center;
  background:
    radial-gradient(ellipse 90% 70% at 10% 20%, rgba(22, 119, 200, 0.22), transparent 55%),
    radial-gradient(ellipse 70% 55% at 90% 85%, rgba(37, 99, 235, 0.16), transparent 50%),
    linear-gradient(160deg, #D6EAF8 0%, #EAF4FB 40%, #CDE3F5 100%);
  border-right: 1px solid #B7D3EA;
  font-family: var(--font-base);
}

.auth-visual__inner {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 48px;
}

.auth-visual__logo {
  height: 72px;
  width: auto;
  max-width: 220px;
  object-fit: contain;
  display: block;
}

.auth-visual__copy {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.auth-visual__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(34px, 3.6vw, 44px);
  font-weight: 750;
  line-height: 1.12;
  letter-spacing: -0.04em;
  color: #123B6D;
}

.auth-visual__title span {
  color: #1677C8;
  font-weight: 700;
}

.auth-visual__sub {
  margin: 0;
  font-size: 16px;
  line-height: 1.65;
  color: #5B738A;
  font-weight: 500;
  max-width: 360px;
}

.auth-visual__footer {
  margin: 0;
  padding-top: 8px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: #8AA0B4;
}
</style>
