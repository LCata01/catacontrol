# CATACONTROL

Sistema POS multi-tenant para boliches, eventos y clubes nocturnos.

CATACONTROL permite gestionar:

- venta de entradas
- venta en barras
- control de cajas
- múltiples terminales
- múltiples usuarios
- impresión de tickets
- gestión multi-establecimiento

Diseñado para trabajar en tiempo real con múltiples operadores.

---

# Features

## Multi-tenant

Cada cliente opera en un entorno aislado.

Ejemplos:

- TEMPLO
- BOLICHE 2
- CLUB 3

Cada tenant tiene sus propios:

- usuarios
- cajas
- productos
- tickets
- configuraciones

---

# Roles

## Super Admin

Acceso global para:

- crear boliches
- editar boliches
- eliminar boliches
- acceder a cualquier tenant
- monitorear terminales activas

---

## Cashier

Operadores de:

### Barra

Ejemplos:

- barra1
- barra2
- barra3

### Entradas

Ejemplos:

- entrada1
- entrada2

---

# Terminales

Soporte para terminales independientes.

## Barras

- BARRA 1
- BARRA 2
- BARRA 3
- BARRA VIP

## Entradas

- ENTRADA 1
- ENTRADA 2
- ENTRADA 3

Cada terminal mantiene su propia numeración local de tickets.

Formato:

`TERMINAL + SECUENCIA`

Ejemplo:

```txt
B01-000001
B01-000002
E01-000001
```

---

# Printing

CATACONTROL utiliza exclusivamente **Browser Print**.

No requiere software adicional ni agentes locales.

Compatible con:

- Google Chrome
- Microsoft Edge

## Características

- impresión directa desde navegador
- compatible con impresoras térmicas USB
- compatible con corte automático (autocutter) mediante driver nativo
- sin dependencias externas
- sin servicios en segundo plano
- instalación simple

---

# Configuración obligatoria de impresión

Antes de utilizar CATACONTROL en producción, cada terminal debe configurarse correctamente.

## 1. Instalar driver de impresora

Instalar el driver:

**80mmC**

(o el driver provisto por el fabricante compatible con ESC/POS)

Compatible con impresoras:

- Epson
- XPrinter
- GPrinter
- 3nStar
- genéricas 80mm

---

## 2. Crear tamaño de papel personalizado en Windows

Crear un nuevo formulario de impresión:

Nombre:

**Ticket80**

Configurar:

Ancho:

**80 mm**

Alto:

**1000 mm**

(altura máxima para tickets variables)

---

## 3. Configurar impresora

En propiedades de la impresora seleccionar:

**Ticket80**

Activar:

- Auto Cut
- Partial Cut

Desactivar:

- márgenes automáticos
- escalado

Escala:

**100%**

---

## 4. Primera validación

Antes de habilitar ventas, cada terminal debe realizar una impresión de prueba.

CATACONTROL bloquea la operación hasta confirmar:

- impresora detectada
- tamaño correcto
- corte automático funcionando

---

# Tech Stack

Frontend:

- TypeScript
- React
- Vite

Backend:

- Supabase
- PostgreSQL

Printing:

- Browser Print API
- Native OS Printer Drivers

---

# Requirements

Instalar:

- Google Chrome
- Driver térmico 80mmC

Sistema operativo recomendado:

- Windows 10
- Windows 11

Hardware recomendado:

- PC dedicada por terminal
- Impresora térmica USB 80 mm con cutter

---

# Installation

Clonar repositorio:

```bash
git clone https://github.com/LCata01/catacontrol.git
cd catacontrol
```

Instalar dependencias:

```bash
npm install
```

Ejecutar en desarrollo:

```bash
npm run dev
```

Build producción:

```bash
npm run build
```

---

# Production Environment

Configuración recomendada:

- Windows 10/11
- Google Chrome en modo kiosk
- Impresora térmica 80 mm USB
- resolución fija por terminal

---

# Security

Cada terminal mantiene:

- sesión persistente
- numeración local
- caja independiente
- bloqueo de rutas protegidas
- autenticación por rol

---

# License

Software privado.

Todos los derechos reservados.

**CATACONTROL © 2026**
