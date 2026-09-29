# SCOUTS CANTEEN POS (Point-of-Sale System)

A production-ready, offline-first Point-of-Sale (POS) system designed for the **Uganda Scouts Association** canteen. Optimized to run on a Windows/Linux laptop or desktop with a standard plug-and-play **USB Barcode Scanner**, continuous thermal receipt printer, and local SQLite database.

---

## 1. System Overview & Core Capabilities

- **USB Barcode Scanner Support**: Works out of the box with standard USB HID barcode scanners (emulates keyboard keystrokes + Enter). Autofocus keeps the scanner ready without clicking.
- **Offline-First SQLite Database**: Entire database runs locally inside `./data/scouts_canteen.sqlite`. Zero internet connection required for core canteen sales.
- **Uganda Shillings (UGX)**: Pre-configured currency formatting (e.g. `UGX 5,000`), fast denomination cash buttons (1k, 2k, 5k, 10k, 20k, 50k), and automatic change calculation.
- **Uganda Payment Channels**: Cash, MTN Mobile Money (with TID reference), Airtel Money, and Card/POS.
- **Thermal Receipt Printing**: Direct browser thermal printing for standard **80mm** and **58mm** receipt paper widths, with reprint history.
- **Barcode Generator**: Generates standard Code 128 barcodes and prints printable multi-label sheets for unbarcoded scout items.
- **Cashier Shifts**: Daily register balancing, opening float, expected cash vs counted cash calculation, and difference discrepancy tracking.
- **Scout Attribution**: Track purchases by Scout member, Patrol (Eagle, Lion, Buffalo, Cobra, Falcon, etc.), Section (Cubs, Scouts, Ventures, Rovers), and School Troop.
- **Inventory & Stock Movements**: Real-time stock decrements upon sale, stock adjustments with audit reasons (Purchase, Damaged, Lost, Expired), and low-stock alerts.
- **Disaster Recovery**: 1-click database backup download (`.sqlite`) and restore from file.

---

## 2. Hardware Setup

```
[USB Barcode Scanner]
       ↓ (Standard USB HID / Keyboard input)
[Laptop / Desktop (Windows/Mac/Linux)]
       ↓ (Offline Node.js + Express + SQLite)
[SCOUTS CANTEEN POS Applet]
       ↓
[Thermal Receipt Printer (58mm / 80mm)]
```

### Setting up the USB Barcode Scanner
1. Plug the scanner's USB cable into any USB port on your laptop.
2. Windows will automatically recognize it as a "HID Keyboard Device" (no proprietary drivers needed).
3. Open the POS application in your browser (`http://localhost:3000`).
4. Click on the **Scanner Test Mode** tab in the navigation bar.
5. Scan any barcode (such as mineral water `6001001` or a snack). The screen will immediately display the scanned code, characters, speed, and matched product!

---

## 3. Quick Start (Windows Laptop)

### 1-Click Launch
Double-click `start-pos.bat`. It will automatically check Node.js, install dependencies if needed, launch the server, and open your web browser to `http://localhost:3000`.

### Manual Launch (Terminal)
```bash
# 1. Install dependencies
npm install

# 2. Start the POS application
npm run dev

# 3. Access in browser
http://localhost:3000
```

---

## 4. Default Login Credentials

| Role | Username | Default Password | Permissions |
|---|---|---|---|
| **Administrator** | `admin` | `scouts2026` | Full system control: products, prices, inventory adjustments, reports, backups, user management |
| **Cashier** | `cashier` | `scouts123` | POS sales, barcode scanning, cart management, receipt printing, opening/closing own shift |

*(You can create additional cashier and admin accounts in the **Users & Audits** tab.)*

---

## 5. Keyboard Shortcuts (Cashier Fast Flow)

| Key | Action |
|---|---|
| **F1** | Start New Sale / Clear Current Cart |
| **F2** | Autofocus USB Barcode Scanner Input |
| **F3** | Hold Current In-Progress Sale (Queue) |
| **F4** | Retrieve Held Sale |
| **F5** | Open Payment & Checkout Modal |
| **Ctrl + Enter** | Quick Complete Sale |
| **ESC** | Close Dialogs / Cancel Action |

---

## 6. Preloaded Sample Products (Uganda Scouts Canteen)

The system initializes with realistic products for a Ugandan Scouts canteen:
- **Water**: Rwenzori 500ml (`6001001`), Highland 1.5L (`6001002`)
- **Drinks**: Coca-Cola 300ml (`6001003`), Fanta Orange (`6001004`), Minute Maid Mango (`6001005`)
- **Snacks & Food**: Sumz Potato Crisps (`6001006`), Gorillos (`6001007`), Chapati (`6001008`), Rolex (`6001009`)
- **Stationery**: Picfare 96-Page Exercise Book (`6001010`), Bic Blue Pen (`6001011`)
- **Scout Uniforms & Badges**: Official Uganda Scout Neckerchief (`6001012`), Leather Woggle (`6001013`), Scout Shirt (`6001014`), Leather Belt (`6001015`), Beret (`6001016`), Investiture Badge (`6001017`), Patrol Leader Strips (`6001018`), First Aid Badge (`6001019`)
- **Scout Equipment**: Scout Whistle (`6001020`), Silva Compass (`6001021`), Mess Tin (`6001022`), Groundsheet (`6001023`), Scouting for Boys book (`6001024`)

---

## 7. Troubleshooting Guide

### 1. Barcode Scanner Not Scanning
- Ensure the scanner is plugged firmly into a working USB port.
- Check the top bar indicator: it should say **"SCANNER READY"** (pulsing green dot). If not, press **F2** to focus the scanner input.
- Test the scanner in Notepad: scan a barcode; if digits appear followed by a new line, the scanner is working. If no digits appear, refer to the scanner manufacturer's manual barcode to reset to "USB HID / Keyboard" mode.

### 2. Product Not Found Banner Appears
- If a scanned barcode is not yet registered in the database, a banner will appear displaying the code.
- As an Administrator, click **"Register New Product with this Barcode"** to enter the product details immediately.

### 3. Thermal Printer Setup (58mm or 80mm)
- Connect your thermal receipt printer via USB or Bluetooth.
- In the browser print dialog (`Ctrl+P` or click Print Receipt):
  - Select your thermal printer as destination.
  - Set paper size to `80mm` or `58mm` (or `Continuous Roll`).
  - Set Margins to `None` or `Minimum`.
  - Disable "Headers and Footers" to ensure crisp thermal output.

### 4. Port 3000 Already in Use
- If port 3000 is occupied by another process, pass the `PORT` environment variable:
  ```bash
  PORT=3001 npm run dev
  ```

### 5. Database Backup & Restore
- The SQLite database file is stored at `./data/scouts_canteen.sqlite`.
- To create a backup, click **Backup/Restore** in the Admin navigation and click **Download Database Backup File**.
- To restore, select the `.sqlite` file in the restore panel.
