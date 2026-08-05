import { Controller, Get, Res } from "@nestjs/common";
import type { Response } from "express";
import { PublicRoute } from "../../common/auth-context";

function renderRootHtml(): string {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tasks Dash · Production API Gateway</title>
  
  <!-- Meta & OpenGraph Logo -->
  <link rel="icon" type="image/png" href="/public/assets/images/logo.png">
  <link rel="apple-touch-icon" href="/public/assets/images/logo.png">
  <meta property="og:title" content="Tasks Dash API Gateway">
  <meta property="og:description" content="Production Backend Services & OpenAPI Documentation for Tasks Dash">
  <meta property="og:image" content="/public/assets/images/logo.png">
  <meta property="og:type" content="website">

  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">

  <style>
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #f8fafc;
      background: #0f172a;
      overflow-x: hidden;
      position: relative;
    }

    /* Background image & Glass overlay */
    .bg-layer {
      position: fixed;
      inset: 0;
      background: 
        radial-gradient(circle at 50% 20%, rgba(99, 102, 241, 0.25), transparent 70%),
        radial-gradient(circle at 80% 80%, rgba(168, 85, 247, 0.2), transparent 60%),
        linear-gradient(180deg, rgba(15, 23, 42, 0.75) 0%, rgba(15, 23, 42, 0.92) 100%),
        url('/public/assets/images/background.png') center/cover no-repeat;
      z-index: 1;
      filter: saturate(1.1);
    }

    .container {
      position: relative;
      z-index: 2;
      width: 100%;
      max-width: 640px;
      padding: 24px;
    }

    .card {
      background: rgba(30, 41, 59, 0.65);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 32px;
      padding: 48px 40px;
      text-align: center;
      box-shadow: 
        0 25px 50px -12px rgba(0, 0, 0, 0.5),
        0 0 80px rgba(99, 102, 241, 0.15),
        inset 0 1px 1px rgba(255, 255, 255, 0.2);
      transform: translateY(0);
      transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease;
      animation: cardAppear 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .card:hover {
      transform: translateY(-4px);
      box-shadow: 
        0 30px 60px -15px rgba(0, 0, 0, 0.6),
        0 0 100px rgba(168, 85, 247, 0.25),
        inset 0 1px 1px rgba(255, 255, 255, 0.3);
    }

    @keyframes cardAppear {
      from {
        opacity: 0;
        transform: translateY(24px) scale(0.96);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .logo-wrapper {
      position: relative;
      width: 110px;
      height: 110px;
      margin: 0 auto 24px auto;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .logo-glow {
      position: absolute;
      inset: -8px;
      border-radius: 50%;
      background: linear-gradient(135deg, #6366f1, #a855f7, #ec4899);
      opacity: 0.6;
      filter: blur(16px);
      animation: pulseGlow 4s ease-in-out infinite alternate;
    }

    @keyframes pulseGlow {
      0% { opacity: 0.4; transform: scale(0.95); }
      100% { opacity: 0.8; transform: scale(1.08); }
    }

    .logo-img {
      position: relative;
      z-index: 2;
      width: 100%;
      height: 100%;
      object-fit: contain;
      filter: drop-shadow(0 10px 15px rgba(0,0,0,0.4));
      border-radius: 24px;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 18px;
      border-radius: 9999px;
      background: rgba(99, 102, 241, 0.15);
      border: 1px solid rgba(99, 102, 241, 0.35);
      color: #818cf8;
      font-size: 0.85rem;
      font-weight: 600;
      letter-spacing: 0.04em;
      margin-bottom: 20px;
      text-transform: uppercase;
    }

    .badge-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #34d399;
      box-shadow: 0 0 10px #34d399;
      animation: blink 2s ease-in-out infinite;
    }

    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }

    .title {
      font-family: 'Outfit', sans-serif;
      font-size: 2.75rem;
      font-weight: 800;
      line-height: 1.1;
      margin-bottom: 12px;
      background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 50%, #94a3b8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      letter-spacing: -0.02em;
    }

    .description {
      font-size: 1.05rem;
      color: #94a3b8;
      line-height: 1.6;
      margin-bottom: 36px;
      max-width: 480px;
      margin-left: auto;
      margin-right: auto;
    }

    .actions {
      display: flex;
      flex-direction: column;
      gap: 14px;
      margin-bottom: 32px;
      width: 100%;
    }

    @media (min-width: 480px) {
      .actions {
        flex-direction: row;
        align-items: stretch;
      }
    }

    .btn {
      flex: 1 1 0%;
      min-width: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 16px 20px;
      border-radius: 16px;
      font-size: 1rem;
      font-weight: 700;
      text-decoration: none;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      cursor: pointer;
      font-family: inherit;
      white-space: nowrap;
    }

    .btn-primary {
      background: linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #4338ca 100%);
      color: #ffffff;
      box-shadow: 0 10px 25px -5px rgba(99, 102, 241, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .btn-primary:hover {
      background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%);
      box-shadow: 0 15px 30px -5px rgba(99, 102, 241, 0.6);
      transform: translateY(-2px);
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.06);
      color: #e2e8f0;
      border: 1px solid rgba(255, 255, 255, 0.12);
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.12);
      color: #ffffff;
      border-color: rgba(255, 255, 255, 0.25);
      transform: translateY(-2px);
    }

    .btn-success {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
      color: #ffffff !important;
      border-color: rgba(52, 211, 153, 0.5) !important;
      box-shadow: 0 10px 25px -5px rgba(16, 185, 129, 0.5) !important;
    }

    .btn svg {
      width: 20px;
      height: 20px;
      transition: transform 0.25s ease;
    }

    .btn-primary:hover svg {
      transform: translateX(4px);
    }

    .footer {
      margin-top: 24px;
      font-size: 0.85rem;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="bg-layer"></div>

  <div class="container">
    <div class="card">
      <div class="logo-wrapper">
        <div class="logo-glow"></div>
        <img src="/public/assets/images/logo.png" alt="Tasks Dash Logo" class="logo-img">
      </div>

      <div class="badge">
        <span class="badge-dot"></span>
        Production API Operational
      </div>

      <h1 class="title">Tasks Dash API</h1>
      <p class="description">
        Cổng dịch vụ backend cao cấp hỗ trợ NestJS v11, CQRS Architecture, MongoDB Cluster và tự động hóa tích hợp Discord & GitHub.
      </p>

      <div class="actions">
        <a href="/api/docs" class="btn btn-primary">
          <span>Khám phá API Docs</span>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </a>
        <button type="button" id="btn-health" class="btn btn-secondary">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Kiểm tra Health</span>
        </button>
      </div>
    </div>

    <div class="footer">
      &copy; 2026 Tasks Dash. All rights reserved.
    </div>
  </div>

  <script>
    document.getElementById('btn-health').addEventListener('click', async () => {
      const btn = document.getElementById('btn-health');
      btn.style.opacity = '0.7';
      btn.querySelector('span').innerText = 'Đang kiểm tra...';

      try {
        const response = await fetch('/api/health');
        if (response.ok) {
          btn.classList.remove('btn-secondary');
          btn.classList.add('btn-success');
          btn.innerHTML = \`<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg><span>Health</span>\`;
        }
      } catch (error) {
        btn.querySelector('span').innerText = 'Kiểm tra thất bại';
      } finally {
        btn.style.opacity = '1';
      }
    });
  </script>
</body>
</html>`;
}

@Controller()
export class RootController {
  @PublicRoute()
  @Get()
  index(@Res() response: Response): void {
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.send(renderRootHtml());
  }
}
