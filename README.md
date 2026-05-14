# CATACONTROL

Sistema POS multi-tenant para boliches, eventos y clubes nocturnos.

CATACONTROL permite gestionar:

- Venta de entradas
- Venta en barras
- Control de cajas
- Múltiples terminales
- Múltiples usuarios
- Impresión de tickets
- Gestión multi-establecimiento

Diseñado para trabajar en tiempo real con múltiples operadores.

---

# Features

## Multi-tenant

Cada cliente (boliche/evento) tiene su propio entorno aislado.

Ejemplo:

- TEMPLO
- BOLICHE 2
- CLUB 3

Cada tenant tiene:

- usuarios
- cajas
- productos
- tickets
- configuraciones

---

## Roles

### Super Admin

Acceso global:

- crear boliches
- editar boliches
- eliminar boliches
- acceder a cualquier tenant

### Cashier

Operadores de:

- barra
- entradas

Ejemplos:

- cashier1
- cashier2
- entrada1
- entrada2

---

## Terminales

Soporte para:

### Barras

- BARRA 1
- BARRA 2
- BARRA 3

### Entradas

- ENTRADA 1
- ENTRADA 2

Cada terminal trabaja de forma independiente.

---

# Printing

CATACONTROL soporta 3 modos de impresión.

## 1. CATAPRINT (recommended)

Servicio local de impresión.

Features:

- impresión silenciosa
- selección de impresoras
- detección automática
- autocutter ESC/POS
- impresión sin diálogos

Compatible con:

- Epson
- XPrinter
- GPrinter
- 3nStar

---

## 2. QZ Tray

Modo legacy para instalaciones existentes.

---

## 3. Browser Print

Fallback universal.

Features:

- no requiere instalación
- funciona en cualquier navegador

Limitaciones:

- sin autocutter
- abre diálogo de impresión

---

# Tech Stack

Frontend:

- TypeScript
- React
- Vite

Backend local printing:

- Node.js 20 LTS
- Express

Printing:

- Puppeteer
- ESC/POS
- pdf-to-printer

---

# Requirements

Install:

## Node.js

Recommended:

Node 20 LTS

---

# Installation

Clone repository:

```bash
git clone https://github.com/LCata01/catacontrol.git
cd catacontrol
```

Install dependencies:

```bash
npm install
```

Run project:

```bash
npm run dev
```

---

# CATAPRINT

Local printing service.

Install:

```bash
cd cataprint-agent
npm install
```

Run:

```bash
npm start
```

Expected output:

```txt
CATAPRINT v0.1.0 listening on http://localhost:9100
```

Health check:

http://localhost:9100/health

Printers:

http://localhost:9100/printers

---

# Production

Recommended environment:

- Windows 10/11
- Google Chrome
- Node 20 LTS
- Thermal printer 80mm

---

# License

Private software.

All rights reserved.

CATACONTROL © 2026
